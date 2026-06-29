# Ripple

Ripple is a real-time chat application with group rooms, direct messages, typing indicators, and horizontal scaling across multiple server instances. It combines a Next.js frontend with a custom Socket.io server, PostgreSQL persistence, and Redis pub/sub for cross-instance messaging.

---

## Features

### Authentication
- User sign-up and sign-in with username, email, and password
- Session management via **NextAuth.js** (JWT strategy)
- Protected routes — unauthenticated users are redirected to sign-in
- Socket connections authenticated using the same NextAuth session cookie

### Group chat (rooms)
- Create rooms with a name and optional description
- Search and discover rooms
- Join and leave rooms
- Send and receive messages in real time
- View last 50 messages when opening a room
- Live join/leave notifications for room members
- Typing indicators in rooms

### Direct messages
- Search users by username
- One-to-one private messaging
- Message history (last 50 messages)
- Typing indicators for DMs

### Real-time & scaling
- All chat operations run over **WebSockets** (Socket.io) — no REST chat API
- Messages are persisted in **PostgreSQL** via Prisma
- **Redis pub/sub** broadcasts events across multiple app instances
- Run 3 app servers on ports `3000`, `3001`, and `3002` — users on different instances can chat in the same room

### UI
- Dark-themed chat interface at `/homepage`
- Sidebar with Rooms and Users tabs
- Connection status indicator
- Error and status banners

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Real-time | Socket.io 4, socket.io-client |
| Auth | NextAuth.js 4 (Credentials provider, JWT sessions) |
| Database | PostgreSQL, Prisma 7 ORM |
| Pub/sub | Redis 6 (node-redis client) |
| Server | Custom HTTP server (`server.ts`) — Next.js + Socket.io on one port |
| Runtime | Node.js 22, TypeScript, tsx |
| Containerization | Docker, Docker Compose |

---

## Architecture

```
Browser (React)
    │
    ├── Next.js pages (sign-in, sign-up, chat UI)
    ├── NextAuth (session cookie)
    │
    └── Socket.io client (withCredentials)
            │
            ▼
    Custom server (server.ts)
            │
            ├── Next.js request handler (HTTP)
            └── Socket.io server
                    │
                    ├── Auth gate (NextAuth JWT from cookies)
                    ├── Handlers (rooms, users, messages)
                    ├── Prisma → PostgreSQL
                    └── Redis publish
                            │
                            ▼
                    Redis subscribe (all instances)
                            │
                            └── io.to(room/user).emit → connected clients
```

### How cross-instance messaging works

1. User A on **app1** (`localhost:3000`) sends a room message.
2. **app1** saves the message to PostgreSQL and publishes to Redis channel `room:{roomId}`.
3. **app1**, **app2**, and **app3** are all subscribed to that channel.
4. Each instance receives the Redis message and emits a `chat` event to its local Socket.io clients in that room.
5. User B on **app2** (`localhost:3001`) receives the message in real time.

---

## Project structure

```
ripple/
├── server.ts                 # Custom server entry (Next.js + Socket.io + Redis)
├── chatHandler.ts            # Redis subscribe/unsubscribe + message routing
├── redisClient.ts            # Redis publisher/subscriber clients
├── socket/
│   ├── index.ts              # Connection, authentication, handler registration
│   └── handlers/
│       ├── roomHandler.ts    # create/join/leave/list rooms
│       ├── userHandler.ts    # find users
│       ├── messageHandler.ts # messages, typing, history
│       └── pubsubEvents/
│           ├── pubsubFunctions.ts  # DB writes + Redis publish
│           └── eventRouter.ts      # Redis event → Socket.io emit
├── app/
│   ├── (registration)/       # Sign-in and sign-up pages
│   ├── (ui)/homepage/        # Chat UI
│   └── api/auth/             # NextAuth API route
├── components/
│   ├── ChatSocketProvider.tsx  # Socket state + event listeners
│   └── chat/ChatApp.tsx        # Chat interface
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── prisma.ts             # Prisma client
│   ├── socket.ts             # Socket.io client helper
│   ├── reconnect.ts          # Re-join rooms on reconnect
│   └── socket-types.ts       # Shared event types
├── prisma/
│   └── schema.prisma         # User, Room, RoomMessage, DirectMessage
├── docker-compose.yml        # Single app + Postgres + Redis
└── docker-compose-multiple.yml  # 3 app instances + Postgres + Redis
```

---

## Database schema

| Model | Description |
|-------|-------------|
| `User` | Account with username, email, password |
| `Room` | Group chat room (many-to-many with users) |
| `RoomMessage` | Messages sent in a room |
| `DirectMessage` | One-to-one messages between two users |

---

## Socket events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | — | Authenticate using session cookie |
| `create_room` | `{ roomname, description }` | Create a new room |
| `join_room` | `{ roomname }` | Join an existing room |
| `leave_room` | `{ roomname }` | Leave a room |
| `list_room` | `{ filter }` | Search rooms by name |
| `find_user` | `{ filter }` | Search users by username |
| `message_in_room` | `{ text, roomname }` | Send a group message |
| `message_to_user` | `{ otheruser, text }` | Send a direct message |
| `typing_in_room` | `{ roomname }` | Typing indicator in room |
| `typing_to_user` | `{ username }` | Typing indicator in DM |
| `get_message_of_room` | `{ roomname }` | Fetch room history |
| `get_message_of_user` | `{ username }` | Fetch DM history |

### Server → Client

| Event | Description |
|-------|-------------|
| `authenticated` | Socket auth succeeded |
| `auth_error` | Socket auth failed |
| `filter_rooms` | Room search results |
| `filter_users` | User search results |
| `group_chat` | Room message history |
| `direct_chat` | DM history |
| `chat` | Live message (room or DM) |
| `typing` | Someone is typing |
| `join` / `leave` | Member joined or left a room |
| `room_created` / `joined_room` / `left_room` | Room action confirmations |
| `error` | Operation error |

---

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **npm**
- **PostgreSQL**
- **Redis** (required for real-time messaging and multi-instance setup)
- **Docker & Docker Compose** (optional, for containerized runs)

---

## Environment variables

Create a `.env` file in the project root:

```env
# NextAuth
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# Redis
REDIS_URL=redis://localhost:6379

# Multi-instance CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002

# Optional — used in Docker multi-instance logs
INSTANCE_ID=app1
PORT=3000
```

For Docker Compose, use `REDIS_URL=redis://pub-sub:6379` and a `DATABASE_URL` pointing at the `db` service hostname (`ripple-database`).

---

## Getting started

### 1. Install dependencies

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

### 2. Start Redis

```bash
docker run -p 6379:6379 -d redis
```

### 3. Run the app

The app **must** be started with the custom server (`server.ts`). Plain `next dev` does not include Socket.io.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and you will be redirected to `/homepage`.

---

## Docker

### Single instance

```bash
docker compose up --build
```

Runs one app on port **3000**, PostgreSQL, and Redis.

### Multi-instance (3 servers)

```bash
docker compose -f docker-compose-multiple.yml up --build
```

| Instance | URL |
|----------|-----|
| app1 | http://localhost:3000 |
| app2 | http://localhost:3001 |
| app3 | http://localhost:3002 |

Each instance gets its own `NEXTAUTH_URL` and shares PostgreSQL + Redis.

### Testing 3 different users

Cookies for `localhost` are shared across ports in the same browser. To test as 3 separate users, use **different browser contexts**:

| User | URL | Browser |
|------|-----|---------|
| User 1 | http://localhost:3000 | Chrome (normal) |
| User 2 | http://localhost:3001 | Chrome Incognito |
| User 3 | http://localhost:3002 | Firefox |

Then: create a room on one instance, join from the others, and send messages — they should appear in real time across servers.

---

## Local multi-instance (without Docker)

Start Redis once, then run each instance in a separate terminal:

```bash
npm run dev:3000
npm run dev:3001
npm run dev:3002
```

Ensure `DATABASE_URL` points to your local PostgreSQL for all three.

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start custom server (default port 3000) |
| `npm run dev:3000` | Instance on port 3000 |
| `npm run dev:3001` | Instance on port 3001 |
| `npm run dev:3002` | Instance on port 3002 |
| `npm run dev:docker` | Migrate DB + start server (used in Dockerfile) |
| `npm run dev:next` | Next.js only — **no WebSockets** |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/homepage` |
| `/homepage` | Chat UI (protected) |
| `/signIn` | Sign-in page |
| `/signUp` | Sign-up page |
| `/api/auth/*` | NextAuth API |

---

## License

Private project.
