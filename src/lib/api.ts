import { getFirebaseAuth } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_CACHE_TTL_MS = 45 * 60 * 1000;

let cachedToken:
  | {
      uid: string;
      value: string;
      cachedAt: number;
    }
  | null = null;

export type User = {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: User | null;
  optimistic?: boolean;
  client_id?: string;
};

export type Conversation = {
  id: number;
  created_at: string;
  updated_at: string;
  participants: User[];
  last_message: Message | null;
};

export function clearAuthTokenCache(): void {
  cachedToken = null;
}

export function primeAuthTokenCache(user: FirebaseUser, token: string): void {
  cachedToken = {
    uid: user.uid,
    value: token,
    cachedAt: Date.now()
  };
}

async function getToken(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const now = Date.now();
  if (cachedToken && cachedToken.uid === user.uid && now - cachedToken.cachedAt < TOKEN_CACHE_TTL_MS) {
    return cachedToken.value;
  }
  const token = await user.getIdToken();
  primeAuthTokenCache(user, token);
  return token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  return response.json() as Promise<T>;
}

export const api = {
  me: () => apiFetch<User>("/users/me"),
  updateMe: (payload: Partial<Pick<User, "display_name" | "avatar_url">>) =>
    apiFetch<User>("/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
  users: () => apiFetch<User[]>("/users"),
  searchUsers: (query: string) => apiFetch<User[]>(`/users/search?q=${encodeURIComponent(query)}`),
  conversations: () => apiFetch<Conversation[]>("/conversations"),
  createConversation: (participantId: string) =>
    apiFetch<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ participant_id: participantId })
    }),
  messages: (conversationId: number) => apiFetch<Message[]>(`/conversations/${conversationId}/messages`),
  createMessage: (conversationId: number, content: string, imageUrl?: string, clientId?: string) =>
    apiFetch<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, image_url: imageUrl, client_id: clientId })
    }),
  searchMessages: (query: string) => apiFetch<Message[]>(`/messages/search?q=${encodeURIComponent(query)}`),
  updateMessage: (messageId: number, content: string) =>
    apiFetch<Message>(`/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ content }) }),
  deleteMessage: (messageId: number) => apiFetch<Message>(`/messages/${messageId}`, { method: "DELETE" }),
  upload: async (file: File, folder = "messages") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    return apiFetch<{ url: string; path: string }>("/storage/upload", { method: "POST", body: formData });
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<User>("/storage/avatar", { method: "POST", body: formData });
  }
};
