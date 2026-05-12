"use client";

import { PanelLeft, Search, Wifi, WifiOff } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, Message, User } from "@/lib/api";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { OnlineStatus } from "@/components/OnlineStatus";
import { TypingIndicator } from "@/components/TypingIndicator";

type ChatWindowProps = {
  conversation: Conversation | null;
  currentUser: User;
  messages: Message[];
  typingUserIds: Set<string>;
  onlineUserIds: Set<string>;
  socketStatus: string;
  onSend: (content: string, imageUrl?: string) => void;
  onTyping: (isTyping: boolean) => void;
  onEdit: (messageId: number, content: string) => Promise<void>;
  onDelete: (messageId: number) => Promise<void>;
  onSearchMessages: (query: string) => Promise<Message[]>;
  onBack?: () => void;
};

export function ChatWindow({
  conversation,
  currentUser,
  messages,
  typingUserIds,
  onlineUserIds,
  socketStatus,
  onSend,
  onTyping,
  onEdit,
  onDelete,
  onSearchMessages,
  onBack
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const otherParticipants = useMemo(
    () => conversation?.participants.filter((participant) => participant.id !== currentUser.id) ?? [],
    [conversation, currentUser.id]
  );
  const typingNames = otherParticipants.filter((user) => typingUserIds.has(user.id)).map((user) => user.display_name || user.email);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingNames.length]);

  if (!conversation) {
    return (
      <main className="grid h-full flex-1 place-items-center bg-slate-50 p-6 text-center dark:bg-slate-900">
        <div>
          <div className="text-lg font-semibold">Select a conversation</div>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">Search for a user or open an existing chat to start realtime messaging.</p>
        </div>
      </main>
    );
  }

  const primaryUser = otherParticipants[0];
  const connected = socketStatus === "connected";

  async function searchMessages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchResults(query.trim() ? await onSearchMessages(query.trim()) : []);
  }

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
        <button
          type="button"
          onClick={onBack}
          title="Back to conversations"
          className="mr-2 grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 lg:hidden"
        >
          <PanelLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{primaryUser?.display_name || primaryUser?.email || "Conversation"}</div>
          {primaryUser ? <OnlineStatus online={onlineUserIds.has(primaryUser.id)} /> : null}
        </div>
        <form onSubmit={(event) => void searchMessages(event)} className="hidden w-56 items-center rounded-md border border-slate-200 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-900 md:flex">
          <Search size={15} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search messages"
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"
          />
        </form>
        <div className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${connected ? "text-emerald-600" : "text-slate-500"}`}>
          {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
          {socketStatus}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {searchResults.length > 0 ? (
            <div className="mb-2 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-50">
              <div className="mb-2 font-medium">{searchResults.length} matching messages</div>
              <div className="space-y-1">
                {searchResults.slice(0, 5).map((result) => (
                  <div key={result.id} className="truncate text-xs opacity-85">{result.content}</div>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <MessageBubble
              key={`${message.id}-${message.client_id ?? ""}`}
              message={message}
              mine={message.sender_id === currentUser.id}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <TypingIndicator names={typingNames} />
      <MessageInput disabled={!connected} onSend={onSend} onTyping={onTyping} />
    </main>
  );
}
