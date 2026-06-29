"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { connectWithAuth, disconnectSocket, getSocket } from "@/lib/socket";
import type {
  ActiveChat,
  ChatMessage,
  FilterRoom,
  FilterUser,
  JoinLeavePayload,
  LiveChatPayload,
  SocketErrorPayload,
  SystemMessage,
  TypingPayload,
} from "@/lib/socket-types";

type ChatSocketContextValue = {
  isConnected: boolean;
  connectionError: string | null;
  rooms: FilterRoom[];
  users: FilterUser[];
  messages: ChatMessage[];
  systemMessages: SystemMessage[];
  typingUsername: string | null;
  activeChat: ActiveChat;
  statusMessage: string | null;
  errorMessage: string | null;
  roomFilter: string;
  userFilter: string;
  setRoomFilter: (value: string) => void;
  setUserFilter: (value: string) => void;
  selectRoom: (roomname: string) => void;
  selectUser: (username: string) => void;
  clearActiveChat: () => void;
  listRooms: (filter?: string) => void;
  findUsers: (filter?: string) => void;
  createRoom: (roomname: string, description: string) => void;
  joinRoom: (roomname: string) => void;
  leaveRoom: (roomname: string) => void;
  sendMessage: (text: string) => void;
  emitTyping: () => void;
  clearError: () => void;
};

// creation of context with default value as null
const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

function parseError(error: SocketErrorPayload) {
  return typeof error === "string" ? error : error.message;
}

function toIsoDate(value: string | Date) {
  return typeof value === "string" ? value : value.toISOString();
}

function payloadToMessage(payload: LiveChatPayload): ChatMessage {
  return {
    content: payload.text,
    sent_at: toIsoDate(payload.sent_at),
    sent_by: payload.from,
    sent_to: payload.to,
  };
}

function chatMessageKey(message: ChatMessage) {
  return `${message.sent_at}-${message.sent_by}-${message.content}`;
}

// here this wrapper function is doing many jobs --- such as : 

// authentication of user then defining the events (frontend defined events)
// defining the function to use backend defined events and using useContext for avoiding prop drilling

export default function ChatSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const username = session?.user?.username ?? "";

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<FilterRoom[]>([]);
  const [users, setUsers] = useState<FilterUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [typingUsername, setTypingUsername] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const activeChatRef = useRef(activeChat);
  const usernameRef = useRef(username);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef(0);

  activeChatRef.current = activeChat;
  usernameRef.current = username;

  // the functionality of useCallBack is -- (it is similar to useState) -- it ensure to memoize function 
  // until the value inside [] does not change -- we value changes then again this function is called 
  // until then when ever this function is called or variable storing this function is called 
  // this will return same values as memoized 

  const addSystemMessage = useCallback((text: string) => {
    setSystemMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${text}`,
        text,
        sent_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const key = chatMessageKey(message);
      if (prev.some((item) => chatMessageKey(item) === key)) return prev;
      return [...prev, message];
    });
  }, []);

  const listRooms = useCallback((filter = roomFilter) => {
    getSocket().emit("list_room", { filter });
  }, [roomFilter]);

  const findUsers = useCallback((filter = userFilter) => {
    getSocket().emit("find_user", { filter });
  }, [userFilter]);

  const loadRoomHistory = useCallback((roomname: string) => {
    setMessages([]);
    setSystemMessages([]);
    getSocket().emit("get_message_of_room", { roomname });
  }, []);

  const loadDirectHistory = useCallback((otherUsername: string) => {
    setMessages([]);
    setSystemMessages([]);
    getSocket().emit("get_message_of_user", { username: otherUsername });
  }, []);

  const selectRoom = useCallback(
    (roomname: string) => {
      setActiveChat({ type: "room", roomname });
      setTypingUsername(null);
      loadRoomHistory(roomname);
    },
    [loadRoomHistory]
  );

  const selectUser = useCallback(
    (otherUsername: string) => {
      setActiveChat({ type: "direct", username: otherUsername });
      setTypingUsername(null);
      loadDirectHistory(otherUsername);
    },
    [loadDirectHistory]
  );

  const clearActiveChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
    setSystemMessages([]);
    setTypingUsername(null);
  }, []);

  const createRoom = useCallback((roomname: string, description: string) => {
    getSocket().emit("create_room", { roomname, description });
  }, []);

  const joinRoom = useCallback((roomname: string) => {
    getSocket().emit("join_room", { roomname });
  }, []);

  const leaveRoom = useCallback(
    (roomname: string) => {
      getSocket().emit("leave_room", { roomname });
      if (activeChatRef.current?.type === "room" && activeChatRef.current.roomname === roomname) {
        clearActiveChat();
      }
    },
    [clearActiveChat]
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !activeChatRef.current) return;

      const chat = activeChatRef.current;
      const now = new Date().toISOString();

      if (chat.type === "room") {
        getSocket().emit("message_in_room", { text: trimmed, roomname: chat.roomname });
      } else {
        getSocket().emit("message_to_user", { text: trimmed, otheruser: chat.username });
        appendMessage({
          content: trimmed,
          sent_at: now,
          sent_by: usernameRef.current,
          sent_to: chat.username,
        });
      }
    },
    [appendMessage]
  );

  const emitTyping = useCallback(() => {
    const chat = activeChatRef.current;
    if (!chat) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current < 1500) return;
    lastTypingEmitRef.current = now;

    if (chat.type === "room") {
      getSocket().emit("typing_in_room", { roomname: chat.roomname });
    } else {
      getSocket().emit("typing_to_user", { username: chat.username });
    }
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.userId) {
      setIsConnected(false);
      return;
    }

    let cancelled = false;

    // here connectWithAuth() will authenticate the user --- then after that events are defined

    connectWithAuth()
      .then((socket) => {
        if (cancelled) return;

        setIsConnected(true);
        setConnectionError(null);
        socket.emit("list_room", { filter: "" });

        socket.on("filter_rooms", (payload: FilterRoom[]) => {
          setRooms(
            payload.map((room) => ({
              ...room,
              created_at: toIsoDate(room.created_at),
            }))
          );
        });

        socket.on("filter_users", (payload: FilterUser[]) => {
          setUsers(
            payload
              .filter((user) => user.username !== usernameRef.current)
              .map((user) => ({
                ...user,
                created_at: toIsoDate(user.created_at),
              }))
          );
        });

        socket.on("group_chat", (payload: ChatMessage[]) => {
          setMessages(
            payload.map((message) => ({
              ...message,
              sent_at: toIsoDate(message.sent_at),
            }))
          );
        });

        socket.on("direct_chat", (payload: ChatMessage[]) => {
          setMessages(
            payload.map((message) => ({
              ...message,
              sent_at: toIsoDate(message.sent_at),
            }))
          );
        });

        socket.on("chat", (payload: LiveChatPayload) => {
          const chat = activeChatRef.current;
          const me = usernameRef.current;
          if (!chat) return;

          if (
            chat.type === "room" &&
            payload.chat_type === "room" &&
            payload.to === chat.roomname
          ) {
            appendMessage(payloadToMessage(payload));
            return;
          }

          if (chat.type === "direct" && payload.chat_type === "direct") {
            const partner = chat.username;
            const isConversation =
              (payload.from === partner && payload.to === me) ||
              (payload.from === me && payload.to === partner);
            if (isConversation) appendMessage(payloadToMessage(payload));
          }
        });

        socket.on("typing", (payload: TypingPayload) => {
          const chat = activeChatRef.current;
          const me = usernameRef.current;
          if (!chat || payload.username === me) return;

          if (
            chat.type === "room" &&
            payload.roomname === chat.roomname
          ) {
            setTypingUsername(payload.username);
          }

          if (chat.type === "direct" && payload.username === chat.username) {
            setTypingUsername(payload.username);
          }

          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUsername(null), 2500);
        });

        socket.on("join", (payload: JoinLeavePayload) => {
          const chat = activeChatRef.current;
          if (chat?.type === "room") {
            addSystemMessage(`${payload.username} joined the room`);
          }
        });

        socket.on("leave", (payload: JoinLeavePayload) => {
          const chat = activeChatRef.current;
          if (chat?.type === "room") {
            addSystemMessage(`${payload.username} left the room`);
          }
        });

        socket.on("room_created", (payload: { roomname: string }) => {
          setStatusMessage(`Created room "${payload.roomname}"`);
          socket.emit("list_room", { filter: "" });
          selectRoom(payload.roomname);
        });

        socket.on("joined_room", (payload: { roomname: string }) => {
          setStatusMessage(`Joined room "${payload.roomname}"`);
          socket.emit("list_room", { filter: "" });
        });

        socket.on("left_room", (payload: { roomname: string }) => {
          setStatusMessage(`Left room "${payload.roomname}"`);
          socket.emit("list_room", { filter: "" });
        });

        socket.on("error", (payload: SocketErrorPayload) => {
          setErrorMessage(parseError(payload));
        });

        socket.on("disconnect", () => {
          setIsConnected(false);
        });

        socket.on("connect_error", (error: Error) => {
          setConnectionError(error.message);
          setIsConnected(false);
        });
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setConnectionError(error.message);
          setIsConnected(false);
        }
      });

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      disconnectSocket();
    };
  }, [status, session?.user?.userId, addSystemMessage, appendMessage, selectRoom]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const value: ChatSocketContextValue = {
    isConnected,
    connectionError,
    rooms,
    users,
    messages,
    systemMessages,
    typingUsername,
    activeChat,
    statusMessage,
    errorMessage,
    roomFilter,
    userFilter,
    setRoomFilter,
    setUserFilter,
    selectRoom,
    selectUser,
    clearActiveChat,
    listRooms,
    findUsers,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    emitTyping,
    clearError,
  };

  // here we are providing value to be shared
  return (
    <ChatSocketContext.Provider value={value}>
      {children}
    </ChatSocketContext.Provider>
  );
}

// this function is grabbing the value shared through context --- without prop drilling 
export function useChatSocket() {
  const context = useContext(ChatSocketContext);
  if (!context) {
    throw new Error("useChatSocket must be used within ChatSocketProvider");
  }
  return context;
}
