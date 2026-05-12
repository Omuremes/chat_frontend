export function buildChatSocketUrl(conversationId: number, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  const query = new URLSearchParams({ token });
  return `${baseUrl}/ws/chat/${conversationId}?${query.toString()}`;
}

export function buildNotificationsSocketUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  const query = new URLSearchParams({ token });
  return `${baseUrl}/ws/notifications?${query.toString()}`;
}
