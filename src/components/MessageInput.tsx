"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/lib/api";

type MessageInputProps = {
  disabled: boolean;
  onSend: (content: string, imageUrl?: string) => void;
  onTyping: (isTyping: boolean) => void;
};

export function MessageInput({ disabled, onSend, onTyping }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function onFileChange(nextFile: File | null) {
    setFile(nextFile);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  async function submit() {
    if (disabled || uploading || (!content.trim() && !file)) return;
    setUploading(true);
    try {
      const uploaded = file ? await api.upload(file, "messages") : null;
      onSend(content.trim(), uploaded?.url);
      setContent("");
      onFileChange(null);
      onTyping(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      {preview ? (
        <div className="mb-3 flex items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected attachment" className="h-full w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            title="Remove image"
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          title="Attach image"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-teal-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
        >
          <ImagePlus size={19} />
        </button>
        <textarea
          value={content}
          rows={1}
          onChange={(event) => {
            setContent(event.target.value);
            onTyping(event.target.value.length > 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Write a message"
          disabled={disabled || uploading}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || uploading || (!content.trim() && !file)}
          title="Send message"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-coral text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
