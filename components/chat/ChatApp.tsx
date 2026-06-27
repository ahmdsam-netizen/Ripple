"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useChatSocket } from "@/components/ChatSocketProvider";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatApp() {
  const { data: session } = useSession();
  const {
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
    listRooms,
    findUsers,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    emitTyping,
    clearError,
  } = useChatSocket();

  const [sidebarTab, setSidebarTab] = useState<"rooms" | "users">("rooms");
  const [draft, setDraft] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const username = session?.user?.username ?? "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, systemMessages, typingUsername]);

  useEffect(() => {
    const timer = setTimeout(() => listRooms(roomFilter), 300);
    return () => clearTimeout(timer);
  }, [roomFilter, listRooms]);

  useEffect(() => {
    const timer = setTimeout(() => findUsers(userFilter), 300);
    return () => clearTimeout(timer);
  }, [userFilter, findUsers]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  };

  const activeTitle =
    activeChat?.type === "room"
      ? `# ${activeChat.roomname}`
      : activeChat?.type === "direct"
        ? `@ ${activeChat.username}`
        : "Select a room or user";

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-slate-100">
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80">
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-indigo-400">Ripple</h1>
              <p className="text-sm text-slate-400">@{username}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/signIn" })}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`}
            />
            <span className="text-slate-400">
              {isConnected ? "Connected" : connectionError ?? "Connecting..."}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-800">
          {(["rooms", "users"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSidebarTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition ${
                sidebarTab === tab
                  ? "border-b-2 border-indigo-500 text-indigo-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {sidebarTab === "rooms" ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="space-y-3 border-b border-slate-800 p-4">
              <input
                type="text"
                placeholder="Search rooms..."
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="New room name"
                value={newRoomName}
                onChange={(event) => setNewRoomName(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newRoomDescription}
                onChange={(event) => setNewRoomDescription(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newRoomName.trim()) return;
                  createRoom(newRoomName.trim(), newRoomDescription.trim());
                  setNewRoomName("");
                  setNewRoomDescription("");
                }}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold transition hover:bg-indigo-500"
              >
                Create room
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {rooms.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No rooms found.</p>
              ) : (
                rooms.map((room) => {
                  const isActive =
                    activeChat?.type === "room" && activeChat.roomname === room.roomname;
                  return (
                    <div
                      key={room.roomname}
                      className={`mb-2 rounded-xl border p-3 transition ${
                        isActive
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-800 bg-slate-800/40 hover:border-slate-600"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectRoom(room.roomname)}
                        className="w-full text-left"
                      >
                        <p className="font-medium text-slate-100">#{room.roomname}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {room.members} member{room.members === 1 ? "" : "s"} · by {room.admin}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => joinRoom(room.roomname)}
                        className="mt-2 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        Join
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-slate-800 p-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {users.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No users found.</p>
              ) : (
                users.map((user) => {
                  const isActive =
                    activeChat?.type === "direct" && activeChat.username === user.username;
                  return (
                    <button
                      key={user.username}
                      type="button"
                      onClick={() => selectUser(user.username)}
                      className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                        isActive
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-800 bg-slate-800/40 hover:border-slate-600"
                      }`}
                    >
                      <p className="font-medium text-slate-100">@{user.username}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Joined {formatTime(user.created_at)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{activeTitle}</h2>
            {activeChat?.type === "room" && (
              <p className="text-xs text-slate-400">Group chat</p>
            )}
            {activeChat?.type === "direct" && (
              <p className="text-xs text-slate-400">Direct message</p>
            )}
          </div>
          {activeChat?.type === "room" && (
            <button
              type="button"
              onClick={() => leaveRoom(activeChat.roomname)}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10"
            >
              Leave room
            </button>
          )}
        </header>

        {(statusMessage || errorMessage) && (
          <div className="border-b border-slate-800 px-6 py-2">
            {statusMessage && (
              <p className="text-sm text-emerald-300">{statusMessage}</p>
            )}
            {errorMessage && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-red-300">{errorMessage}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-xs text-red-200 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!activeChat ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-500">
                Pick a room from the sidebar or start a direct message with a user.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {messages.map((message) => {
                const isOwn = message.sent_by === username;
                return (
                  <div
                    key={`${message.sent_at}-${message.sent_by}-${message.content}`}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-100"
                      }`}
                    >
                      {!isOwn && (
                        <p className="mb-1 text-xs font-medium text-indigo-200">
                          {message.sent_by}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                      <p className={`mt-1 text-[10px] ${isOwn ? "text-indigo-200" : "text-slate-400"}`}>
                        {formatTime(message.sent_at)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {systemMessages.map((message) => (
                <p
                  key={message.id}
                  className="text-center text-xs italic text-slate-500"
                >
                  {message.text}
                </p>
              ))}

              {typingUsername && (
                <p className="text-sm text-slate-400">{typingUsername} is typing...</p>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {activeChat && (
          <form onSubmit={handleSend} className="border-t border-slate-800 px-6 py-4">
            <div className="mx-auto flex max-w-3xl gap-3">
              <input
                type="text"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  emitTyping();
                }}
                placeholder={
                  activeChat.type === "room"
                    ? `Message #${activeChat.roomname}`
                    : `Message @${activeChat.username}`
                }
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!draft.trim() || !isConnected}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
