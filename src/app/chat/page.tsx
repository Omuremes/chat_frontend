"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChatWindow } from "@/components/ChatWindow";
import { useAuth } from "@/components/AuthProvider";
import { UserSidebar } from "@/components/UserSidebar";
import { api, type Conversation, type Message, type User } from "@/lib/api";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useNotificationsSocket } from "@/hooks/useNotificationsSocket";

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((left, right) => {
    const byDate = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (byDate !== 0) return byDate;
    return left.id - right.id;
  });
}

function upsertMessage(messages: Message[], message: Message, clientId?: string): Message[] {
  const withoutOptimistic = clientId ? messages.filter((item) => item.client_id !== clientId) : messages;
  const exists = withoutOptimistic.some((item) => item.id === message.id);
  const next = exists
    ? withoutOptimistic.map((item) => (item.id === message.id ? message : item))
    : [...withoutOptimistic, message];
  return sortMessages(next);
}

function mergeMessages(existing: Message[], incoming: Message[], conversationId: number): Message[] {
  return incoming.reduce(
    (nextMessages, message) => upsertMessage(nextMessages, message),
    existing.filter((message) => message.conversation_id === conversationId)
  );
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
}

function updateConversationPreview(conversations: Conversation[], message: Message): Conversation[] {
  return sortConversations(
    conversations.map((conversation) =>
      conversation.id === message.conversation_id
        ? { ...conversation, last_message: message, updated_at: message.updated_at }
        : conversation
    )
  );
}

export default function ChatPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !firebaseUser) router.replace("/login");
  }, [authLoading, firebaseUser, router]);

  useEffect(() => {
    if (!firebaseUser) return;
    async function boot() {
      setLoading(true);
      setError(null);
      try {
        const [me, existingConversations] = await Promise.all([api.me(), api.conversations()]);
        setCurrentUser(me);
        setConversations(sortConversations(existingConversations));
        if (existingConversations[0]) setSelectedConversation(existingConversations[0]);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, [firebaseUser]);

  useEffect(() => {
    if (!selectedConversation) return;
    const conversationId = selectedConversation.id;
    let cancelled = false;

    async function loadMessages() {
      setError(null);
      try {
        const loadedMessages = await api.messages(conversationId);
        if (!cancelled) {
          setMessages((existing) => mergeMessages(existing, loadedMessages, conversationId));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Failed to load messages");
        }
      }
    }
    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversation]);

  const onSocketMessage = useCallback((message: Message, clientId?: string) => {
    setMessages((existing) => upsertMessage(existing, message, clientId));
    setConversations((existing) => updateConversationPreview(existing, message));
  }, []);

  const onTyping = useCallback((userId: string, isTyping: boolean) => {
    setTypingUserIds((existing) => {
      const next = new Set(existing);
      if (isTyping) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const onPresence = useCallback((userId: string, isOnline: boolean) => {
    setOnlineUserIds((existing) => {
      const next = new Set(existing);
      if (isOnline) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const { status: socketStatus, sendMessage: sendSocketMessage, sendTyping } = useChatSocket({
    conversationId: selectedConversation?.id ?? null,
    onMessage: onSocketMessage,
    onTyping,
    onPresence
  });

  const onConversationNotification = useCallback(
    (conversationId: number, message: Message) => {
      setConversations((existing) => {
        const hasConversation = existing.some((conversation) => conversation.id === conversationId);
        if (!hasConversation) {
          void api.conversations().then((nextConversations) => setConversations(sortConversations(nextConversations)));
          return existing;
        }
        return updateConversationPreview(existing, message);
      });
      if (selectedConversation?.id === conversationId) {
        setMessages((existing) => upsertMessage(existing, message));
      }
    },
    [selectedConversation?.id]
  );

  useNotificationsSocket({
    enabled: Boolean(currentUser),
    onConversationUpdated: onConversationNotification
  });

  function selectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    setTypingUserIds(new Set());
  }

  function upsertConversation(conversation: Conversation) {
    setConversations((existing) => {
      const others = existing.filter((item) => item.id !== conversation.id);
      return sortConversations([conversation, ...others]);
    });
    setSelectedConversation(conversation);
  }

  async function send(content: string, imageUrl?: string) {
    if (!currentUser || !selectedConversation) return;
    const clientId = crypto.randomUUID();
    const optimisticMessage: Message = {
      id: -Date.now(),
      conversation_id: selectedConversation.id,
      sender_id: currentUser.id,
      content,
      image_url: imageUrl ?? null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: currentUser,
      optimistic: true,
      client_id: clientId
    };
    setMessages((existing) => sortMessages([...existing, optimisticMessage]));
    try {
      const sentOverSocket = sendSocketMessage(content, imageUrl, clientId);
      if (!sentOverSocket) {
        const savedMessage = await api.createMessage(selectedConversation.id, content, imageUrl, clientId);
        setMessages((existing) => upsertMessage(existing, { ...savedMessage, client_id: clientId }, clientId));
      }
    } catch (caught) {
      setMessages((existing) => existing.filter((message) => message.client_id !== clientId));
      setError(caught instanceof Error ? caught.message : "Failed to send message");
    }
  }

  async function editMessage(messageId: number, content: string) {
    const updated = await api.updateMessage(messageId, content);
    setMessages((existing) => sortMessages(existing.map((message) => (message.id === messageId ? updated : message))));
  }

  async function deleteMessage(messageId: number) {
    const deleted = await api.deleteMessage(messageId);
    setMessages((existing) => sortMessages(existing.map((message) => (message.id === messageId ? deleted : message))));
  }

  if (authLoading || loading || !currentUser) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900">Loading chat...</main>;
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {error ? <div className="fixed left-1/2 top-3 z-20 -translate-x-1/2 rounded-md bg-rose-600 px-4 py-2 text-sm text-white shadow-soft">{error}</div> : null}
      <div className="flex h-full flex-col lg:flex-row">
        <div className={`${selectedConversation ? "hidden lg:block" : "block"} h-full lg:w-[360px]`}>
          <UserSidebar
            currentUser={currentUser}
            conversations={conversations}
            selectedConversationId={selectedConversation?.id ?? null}
            onlineUserIds={onlineUserIds}
            onConversationSelect={selectConversation}
            onConversationCreated={upsertConversation}
            onProfileUpdated={setCurrentUser}
          />
        </div>
        <div className={`${selectedConversation ? "block" : "hidden lg:block"} h-full min-w-0 flex-1`}>
          <ChatWindow
            conversation={selectedConversation}
            currentUser={currentUser}
            messages={messages}
            typingUserIds={typingUserIds}
            onlineUserIds={onlineUserIds}
            socketStatus={socketStatus}
            onSend={send}
            onTyping={sendTyping}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onSearchMessages={api.searchMessages}
            onBack={() => setSelectedConversation(null)}
          />
        </div>
      </div>
    </main>
  );
}
