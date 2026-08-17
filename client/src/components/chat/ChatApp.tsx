import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { disconnectSocket, getSocket } from "../../lib/socket";
import type { ActiveChat, ChatMessage, FilterRoom, FilterUser } from "../../lib/socket-types";

const time = (date: string) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatApp() {
  const { user, signOut } = useAuth(); const navigate = useNavigate();
  const [connected, setConnected] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [rooms, setRooms] = useState<FilterRoom[]>([]), [users, setUsers] = useState<FilterUser[]>([]), [messages, setMessages] = useState<ChatMessage[]>([]);
  const [active, setActive] = useState<ActiveChat>(null), [tab, setTab] = useState<"rooms" | "users">("rooms"), [roomFilter, setRoomFilter] = useState(""), [userFilter, setUserFilter] = useState("");
  const [draft, setDraft] = useState(""), [roomname, setRoomname] = useState(""), [description, setDescription] = useState(""), [typing, setTyping] = useState<string | null>(null);
  const activeRef = useRef(active), typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null), lastTyping = useRef(0), end = useRef<HTMLDivElement>(null);
  activeRef.current = active;
  const refreshRooms = (filter = "") => getSocket().emit("list_room", { filter });
  const searchUsers = (filter = "") => getSocket().emit("find_user", { filter });

  useEffect(() => {
    const socket = getSocket();
    const messageKey = (m: ChatMessage) => `${m.sent_at}-${m.sent_by}-${m.content}`;
    socket.on("connect", () => socket.emit("authenticate"));
    socket.on("authenticated", () => { setConnected(true); setError(null); refreshRooms(); });
    socket.on("auth_error", (payload: { message?: string }) => { setError(payload.message ?? "Not authenticated"); setConnected(false); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", e => { setError(e.message); setConnected(false); });
    socket.on("filter_rooms", setRooms);
    socket.on("filter_users", (items: FilterUser[]) => setUsers(items.filter(item => item.username !== user?.username)));
    socket.on("group_chat", setMessages); socket.on("direct_chat", setMessages);
    socket.on("chat", (payload: { chat_type: "room" | "direct"; from: string; to: string; text: string; sent_at: string }) => {
      const chat = activeRef.current; if (!chat) return;
      const relevant = chat.type === "room" ? payload.chat_type === "room" && payload.to === chat.roomname : payload.chat_type === "direct" && (payload.from === chat.username || payload.to === chat.username);
      if (relevant) setMessages(prev => { const message = { content: payload.text, sent_at: payload.sent_at, sent_by: payload.from, sent_to: payload.to }; return prev.some(item => messageKey(item) === messageKey(message)) ? prev : [...prev, message]; });
    });
    socket.on("typing", (payload: { username: string; roomname?: string }) => { const chat = activeRef.current; if (!chat || payload.username === user?.username || (chat.type === "room" && payload.roomname !== chat.roomname) || (chat.type === "direct" && payload.username !== chat.username)) return; setTyping(payload.username); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(null), 2500); });
    socket.on("room_created", (payload: { roomname: string }) => { setNotice(`Created room “${payload.roomname}”`); selectRoom(payload.roomname); refreshRooms(); });
    socket.on("joined_room", (payload: { roomname: string }) => { setNotice(`Joined “${payload.roomname}”`); refreshRooms(); });
    socket.on("left_room", () => refreshRooms()); socket.on("room_deleted", () => { setActive(null); refreshRooms(); });
    socket.on("error", (payload: { message?: string } | string) => setError(typeof payload === "string" ? payload : payload.message ?? "Socket error"));
    socket.connect();
    return () => { if (typingTimer.current) clearTimeout(typingTimer.current); disconnectSocket(); };
  }, [user?.username]);
  useEffect(() => { const id = setTimeout(() => refreshRooms(roomFilter), 250); return () => clearTimeout(id); }, [roomFilter]);
  useEffect(() => { const id = setTimeout(() => searchUsers(userFilter), 250); return () => clearTimeout(id); }, [userFilter]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages, typing]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(null), 3000); return () => clearTimeout(id); }, [notice]);
  function selectRoom(name: string) { setActive({ type: "room", roomname: name }); setMessages([]); setTyping(null); getSocket().emit("get_message_of_room", { roomname: name }); }
  function selectUser(name: string) { setActive({ type: "direct", username: name }); setMessages([]); setTyping(null); getSocket().emit("get_message_of_user", { username: name }); }
  function createRoom() { if (!roomname.trim()) return; getSocket().emit("create_room", { roomname: roomname.trim(), description: description.trim() }); setRoomname(""); setDescription(""); }
  function send(event: FormEvent) { event.preventDefault(); if (!draft.trim() || !active) return; const text = draft.trim(); getSocket().emit(active.type === "room" ? "message_in_room" : "message_to_user", active.type === "room" ? { text, roomname: active.roomname } : { text, otheruser: active.username }); setDraft(""); }
  function emitTyping() { if (!active || Date.now() - lastTyping.current < 1500) return; lastTyping.current = Date.now(); getSocket().emit(active.type === "room" ? "typing_in_room" : "typing_to_user", active.type === "room" ? { roomname: active.roomname } : { username: active.username }); }
  async function logout() { await signOut(); disconnectSocket(); navigate("/signin"); }
  const title = active?.type === "room" ? `# ${active.roomname}` : active?.type === "direct" ? `@ ${active.username}` : "Select a room or user";
  return <div className="flex h-screen bg-slate-950 text-slate-100"><aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900"><header className="border-b border-slate-800 p-4"><div className="flex justify-between"><div><h1 className="text-xl font-bold text-indigo-400">Ripple</h1><p className="text-sm text-slate-400">@{user?.username}</p></div><button onClick={logout} className="text-xs text-slate-300">Sign out</button></div><p className="mt-3 text-xs text-slate-400"><span className={connected ? "text-emerald-400" : "text-red-400"}>●</span> {connected ? "Connected" : "Connecting…"}</p></header><div className="grid grid-cols-2 border-b border-slate-800">{(["rooms", "users"] as const).map(value => <button key={value} onClick={() => setTab(value)} className={`p-3 capitalize ${tab === value ? "border-b-2 border-indigo-500 text-indigo-300" : "text-slate-400"}`}>{value}</button>)}</div>{tab === "rooms" ? <div className="overflow-y-auto p-3"><input className="input mb-3" placeholder="Search rooms" value={roomFilter} onChange={e => setRoomFilter(e.target.value)} /><input className="input mb-2" placeholder="New room" value={roomname} onChange={e => setRoomname(e.target.value)} /><input className="input mb-2" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} /><button onClick={createRoom} className="mb-3 w-full rounded bg-indigo-600 p-2 text-sm">Create room</button>{rooms.map(room => <div key={room.roomname} className={`mb-2 rounded border p-3 ${active?.type === "room" && active.roomname === room.roomname ? "border-indigo-500" : "border-slate-700"}`}><button onClick={() => selectRoom(room.roomname)} className="w-full text-left"><b>#{room.roomname}</b><p className="text-xs text-slate-400">{room.members} members · by {room.admin}</p></button><button onClick={() => getSocket().emit("join_room", { roomname: room.roomname })} className="mt-2 text-xs text-indigo-300">Join</button></div>)}</div> : <div className="overflow-y-auto p-3"><input className="input mb-3" placeholder="Search users" value={userFilter} onChange={e => setUserFilter(e.target.value)} />{users.map(item => <button key={item.username} onClick={() => selectUser(item.username)} className={`mb-2 w-full rounded border p-3 text-left ${active?.type === "direct" && active.username === item.username ? "border-indigo-500" : "border-slate-700"}`}><b>@{item.username}</b></button>)}</div>}</aside><main className="flex min-w-0 flex-1 flex-col"><header className="flex items-center justify-between border-b border-slate-800 p-5"><div><h2 className="font-semibold">{title}</h2>{notice && <p className="text-xs text-emerald-300">{notice}</p>}{error && <p className="text-xs text-red-300">{error}</p>}</div>{active?.type === "room" && <button onClick={() => getSocket().emit("leave_room", { roomname: active.roomname })} className="text-sm text-red-300">Leave room</button>}</header><section className="flex-1 overflow-y-auto p-6">{active ? <div className="mx-auto flex max-w-3xl flex-col gap-3">{messages.map(message => <div key={`${message.sent_at}-${message.sent_by}-${message.content}`} className={message.sent_by === user?.username ? "text-right" : "text-left"}><div className={`inline-block max-w-[75%] rounded-2xl px-4 py-2 ${message.sent_by === user?.username ? "bg-indigo-600" : "bg-slate-800"}`}>{message.sent_by !== user?.username && <b className="block text-xs text-indigo-200">{message.sent_by}</b>}<p className="break-words text-sm">{message.content}</p><small className="text-slate-300">{time(message.sent_at)}</small></div></div>)}{typing && <p className="text-sm text-slate-400">{typing} is typing…</p>}<div ref={end} /></div> : <p className="grid h-full place-items-center text-slate-500">Pick a room or user to start chatting.</p>}</section>{active && <form onSubmit={send} className="border-t border-slate-800 p-4"><div className="mx-auto flex max-w-3xl gap-3"><input className="input flex-1" value={draft} onChange={e => { setDraft(e.target.value); emitTyping(); }} placeholder="Write a message" /><button disabled={!connected || !draft.trim()} className="rounded bg-indigo-600 px-5 disabled:opacity-50">Send</button></div></form>}</main></div>;
}
