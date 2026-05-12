"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { Message } from "@/lib/api";

type MessageBubbleProps = {
  message: Message;
  mine: boolean;
  onEdit: (messageId: number, content: string) => Promise<void>;
  onDelete: (messageId: number) => Promise<void>;
};

export function MessageBubble({ message, mine, onEdit, onDelete }: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(message.content);

  async function saveEdit() {
    if (!content.trim()) return;
    await onEdit(message.id, content.trim());
    setEditing(false);
  }

  const bubbleTone = mine
    ? "bg-teal-600 text-white"
    : "bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700";

  return (
    <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-lg px-3 py-2 shadow-sm ${bubbleTone}`}>
        {message.image_url && !message.is_deleted ? (
          <div className="mb-2 overflow-hidden rounded-md">
            <Image src={message.image_url} alt="Message attachment" width={360} height={240} className="h-auto w-full object-cover" />
          </div>
        ) : null}

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-teal-400"
            />
            <button type="button" onClick={saveEdit} title="Save" className="grid h-7 w-7 place-items-center rounded-md bg-white/20">
              <Check size={15} />
            </button>
            <button type="button" onClick={() => setEditing(false)} title="Cancel" className="grid h-7 w-7 place-items-center rounded-md bg-white/20">
              <X size={15} />
            </button>
          </div>
        ) : (
          <p className={`break-words text-sm leading-6 ${message.is_deleted ? "italic opacity-70" : ""}`}>
            {message.is_deleted ? "Message deleted" : message.content}
          </p>
        )}

        <div className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${mine ? "text-teal-50" : "text-slate-500"}`}>
          {message.optimistic ? <span>Sending</span> : <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          {mine && !message.optimistic && !message.is_deleted && !editing ? (
            <span className="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={() => setEditing(true)} title="Edit message" className="grid h-6 w-6 place-items-center rounded-md hover:bg-white/20">
                <Pencil size={13} />
              </button>
              <button type="button" onClick={() => onDelete(message.id)} title="Delete message" className="grid h-6 w-6 place-items-center rounded-md hover:bg-white/20">
                <Trash2 size={13} />
              </button>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
