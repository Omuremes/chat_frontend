"use client";

import { MessageCircle } from "lucide-react";
import type { Conversation, User } from "@/lib/api";
import { OnlineStatus } from "@/components/OnlineStatus";

type ConversationListProps = {
  conversations: Conversation[];
  currentUser: User;
  selectedId: number | null;
  onlineUserIds: Set<string>;
  onSelect: (conversation: Conversation) => void;
};

export function ConversationList({ conversations, currentUser, selectedId, onlineUserIds, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Start a chat from search.</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {conversations.map((conversation) => {
        const other = conversation.participants.find((participant) => participant.id !== currentUser.id) ?? conversation.participants[0];
        const selected = selectedId === conversation.id;
        return (
          <button
            type="button"
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition ${
              selected ? "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-50" : "hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-md bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {other.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatar_url} alt={other.display_name || other.email} className="h-full w-full rounded-md object-cover" />
              ) : (
                <MessageCircle size={19} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{other.display_name || other.email}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {conversation.last_message?.is_deleted ? "Deleted message" : conversation.last_message?.content || "No messages yet"}
              </div>
              <OnlineStatus online={onlineUserIds.has(other.id)} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
