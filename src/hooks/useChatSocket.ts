"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { Message } from "@/lib/api";
import { buildChatSocketUrl } from "@/lib/websocket";

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type UseChatSocketArgs = {
  conversationId: number | null;
  onMessage: (message: Message, clientId?: string) => void;
  onTyping: (userId: string, isTyping: boolean) => void;
  onPresence: (userId: string, isOnline: boolean) => void;
};

type ServerEvent =
  | { type: "message"; message: Message; client_id?: string }
  | { type: "typing"; user_id: string; is_typing: boolean }
  | { type: "presence"; user_id: string; is_online: boolean }
  | { type: "error"; message: string };

export function useChatSocket({ conversationId, onMessage, onTyping, onPresence }: UseChatSocketArgs) {
  const [status, setStatus] = useState<SocketStatus>("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    async function openSocket() {
      const auth = getFirebaseAuth();
      if (!conversationId || !auth.currentUser) return;
      shouldReconnect.current = true;
      setStatus("connecting");
      const token = await auth.currentUser.getIdToken();
      const socket = new WebSocket(buildChatSocketUrl(conversationId, token));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        let payload: ServerEvent;
        try {
          payload = JSON.parse(event.data) as ServerEvent;
        } catch {
          setStatus("error");
          return;
        }
        if (payload.type === "message") onMessage(payload.message, payload.client_id);
        if (payload.type === "typing") onTyping(payload.user_id, payload.is_typing);
        if (payload.type === "presence") onPresence(payload.user_id, payload.is_online);
        if (payload.type === "error") setStatus("error");
      };

      socket.onerror = () => setStatus("error");
      socket.onclose = () => {
        setStatus("disconnected");
        if (!shouldReconnect.current) return;
        reconnectAttempt.current += 1;
        const delay = Math.min(1000 * reconnectAttempt.current, 5000);
        reconnectTimer.current = setTimeout(() => void openSocket(), delay);
      };
    }

    void openSocket();
    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close(1000);
      socketRef.current = null;
      setStatus("idle");
    };
  }, [conversationId, onMessage, onPresence, onTyping]);

  const sendMessage = useCallback((content: string, imageUrl?: string, clientId?: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify({ type: "message", content, image_url: imageUrl, client_id: clientId }));
    return true;
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }
  }, []);

  return { status, sendMessage, sendTyping };
}
