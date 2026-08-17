export type ChatMessage = { content: string; sent_at: string; sent_by: string; sent_to: string };
export type FilterRoom = { roomname: string; admin: string; created_at: string; members: number };
export type FilterUser = { username: string; created_at: string };
export type ActiveChat = { type: "room"; roomname: string } | { type: "direct"; username: string } | null;
