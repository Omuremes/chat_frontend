"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import { buildNotificationsSocketUrl } from "@/lib/websocket";

type NotificationEvent =
  | { type: "conversation_updated"; conversation_id: number; message: Message }
  | { type: "error"; message: string };

type UseNotificationsSocketArgs = {
  enabled: boolean;
  onConversationUpdated: (conversationId: number, message: Message) => void;
};

export function useNotificationsSocket({ enabled, onConversationUpdated }: UseNotificationsSocketArgs) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    async function openSocket() {
      if (!enabled) return;
      const auth = getFirebaseAuth();
      if (!auth.currentUser) return;

      shouldReconnect.current = true;
      const token = await auth.currentUser.getIdToken();
      const socket = new WebSocket(buildNotificationsSocketUrl(token));
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
      };

      socket.onmessage = (event) => {
        let payload: NotificationEvent;
        try {
          payload = JSON.parse(event.data) as NotificationEvent;
        } catch {
          return;
        }
        if (payload.type === "conversation_updated") {
          onConversationUpdated(payload.conversation_id, payload.message);
        }
      };

      socket.onclose = () => {
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
    };
  }, [enabled, onConversationUpdated]);
}
