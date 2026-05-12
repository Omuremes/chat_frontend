"use client";

import { LogOut, Search, Upload } from "lucide-react";
import { signOut } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { api, type Conversation, type User } from "@/lib/api";
import { ConversationList } from "@/components/ConversationList";
import { DarkModeToggle } from "@/components/DarkModeToggle";

type UserSidebarProps = {
  currentUser: User;
  conversations: Conversation[];
  selectedConversationId: number | null;
  onlineUserIds: Set<string>;
  onConversationSelect: (conversation: Conversation) => void;
  onConversationCreated: (conversation: Conversation) => void;
  onProfileUpdated: (user: User) => void;
};

export function UserSidebar({
  currentUser,
  conversations,
  selectedConversationId,
  onlineUserIds,
  onConversationSelect,
  onConversationCreated,
  onProfileUpdated
}: UserSidebarProps) {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return undefined;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      void api
        .searchUsers(normalizedQuery)
        .then((users) => {
          if (controller.signal.aborted || searchRequestRef.current !== requestId) return;
          setResults(
            users.filter(
              (user) =>
                user.id !== currentUser.id &&
                user.firebase_uid !== currentUser.firebase_uid &&
                user.email !== currentUser.email
            )
          );
        })
        .finally(() => {
          if (!controller.signal.aborted && searchRequestRef.current === requestId) setSearching(false);
        });
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [currentUser.email, currentUser.firebase_uid, currentUser.id, query]);

  function setQuery(value: string) {
    setQueryState(value);
    if (value.trim().length < 2) {
      searchRequestRef.current += 1;
      setResults([]);
      setSearching(false);
    }
  }

  async function startConversation(userId: string) {
    const conversation = await api.createConversation(userId);
    onConversationCreated(conversation);
    setQuery("");
    setResults([]);
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    const user = await api.uploadAvatar(file);
    onProfileUpdated(user);
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:w-[360px]">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title="Upload avatar"
              className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {currentUser.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUser.avatar_url} alt={currentUser.display_name || currentUser.email} className="h-full w-full object-cover" />
              ) : (
                <Upload size={18} />
              )}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{currentUser.display_name || currentUser.email}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <DarkModeToggle />
            <button
              type="button"
              title="Sign out"
              onClick={() => signOut(getFirebaseAuth())}
              className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
            className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>

      {query.trim().length >= 2 ? (
        <div className="border-b border-slate-200 p-2 dark:border-slate-800">
          {searching ? <div className="px-3 py-3 text-sm text-slate-500">Searching...</div> : null}
          {results.map((user) => (
            <button
              type="button"
              key={user.id}
              onClick={() => void startConversation(user.id)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <div className="h-9 w-9 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.display_name || user.email}</div>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
              </div>
            </button>
          ))}
          {!searching && results.length === 0 ? <div className="px-3 py-3 text-sm text-slate-500">No users found.</div> : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationList
          conversations={conversations}
          currentUser={currentUser}
          selectedId={selectedConversationId}
          onlineUserIds={onlineUserIds}
          onSelect={onConversationSelect}
        />
      </div>
    </aside>
  );
}
