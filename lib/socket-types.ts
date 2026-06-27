export type ChatMessage = {
  content: string;
  sent_at: string;
  sent_by: string;
  sent_to: string;
};

export type SystemMessage = {
  id: string;
  text: string;
  sent_at: string;
};

export type FilterRoom = {
  roomname: string;
  admin: string;
  created_at: string;
  members: number;
};

export type FilterUser = {
  username: string;
  created_at: string;
};

export type LiveChatPayload = {
  event_type: "chat";
  chat_type: "room" | "direct";
  from: string;
  text: string;
  to: string;
  sent_at: string;
};

export type TypingPayload = {
  event_type: "typing";
  username: string;
  roomname?: string;
};

export type JoinLeavePayload = {
  event_type: "join" | "leave";
  username: string;
};

export type ActiveChat =
  | { type: "room"; roomname: string }
  | { type: "direct"; username: string }
  | null;

export type SocketErrorPayload = { message: string } | string;
