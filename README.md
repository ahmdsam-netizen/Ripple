# Ripple

Ripple is a real-time chat application with group rooms, direct messages, typing indicators, and horizontal scaling across multiple server instances.

The application is structured into two completely decoupled and independent projects:
- **`backend/`**: Node.js + Express + Socket.io Server + Prisma ORM (PostgreSQL) + Redis (Pub/Sub)
- **`frontend/`**: React 19 + Vite + Tailwind CSS 4 SPA

---

## Project Structure

```text
ripple/
├── backend/                  # Standalone Backend Project (Deploy independently)
│   ├── server.ts             # Express & Socket.io server entry
│   ├── chatHandler.ts        # Redis Pub/Sub pub/sub routing & message broadcasting
│   ├── redisClient.ts        # Redis publisher & subscriber connections
│   ├── server/
│   │   ├── auth.ts           # JWT authentication, verification & cookie options
│   │   └── routes/auth.ts    # /api/auth/signup, /signin, /signout, /me endpoints
│   ├── socket/
│   │   ├── index.ts          # Socket authentication & connection handling
│   │   └── handlers/         # Message, Room, User, Pub/Sub event handlers
│   ├── lib/                  # Prisma singleton, cookie parser, reconnect sync
│   ├── prisma/               # Schema models & PostgreSQL migrations
│   ├── prisma.config.ts      # Prisma 7 config
│   ├── package.json          # Backend dependencies & scripts
│   ├── tsconfig.json         # Backend TypeScript config
│   ├── Dockerfile            # Backend container definition
│   └── .env.example
│
├── frontend/                 # Standalone Frontend Project (Deploy independently)
│   ├── src/
│   │   ├── components/       # ChatApp, ProtectedRoute, UI components
│   │   ├── contexts/         # AuthContext (user session state)
│   │   ├── pages/            # SignInPage, SignUpPage
│   │   ├── lib/              # api.ts (REST fetcher), socket.ts (Socket.io client)
│   │   ├── styles.css        # Tailwind styles
│   │   └── main.tsx          # React Router & app entrypoint
│   ├── index.html            # HTML template
│   ├── vite.config.ts        # Vite configuration & dev proxy
│   ├── postcss.config.mjs    # PostCSS Tailwind config
│   ├── package.json          # Frontend dependencies & build script
│   ├── tsconfig.json         # Frontend TypeScript config
│   └── .env.example
│
├── docker-compose.yml        # Single instance backend + Postgres + Redis
├── docker-compose-multiple.yml # Multi-instance backend + Postgres + Redis
├── package.json              # Root npm workspaces & convenience scripts
└── README.md
```

---

## Local Development

### 1. Install all dependencies (at root)
```bash
npm install
```

### 2. Set up environment variables
- In `backend/.env`:
  ```env
  PORT=3000
  NODE_ENV=development
  DATABASE_URL=postgresql://ripple:ripplepassword@localhost:5432/ripple
  REDIS_URL=redis://localhost:6379
  JWT_SECRET="your-strong-jwt-secret"
  ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
  ```
- In `frontend/.env`:
  ```env
  # Leave empty in local dev to use Vite's proxy to localhost:3000
  VITE_API_URL=
  VITE_SOCKET_URL=
  ```

### 3. Generate Prisma client & run migrations
```bash
cd backend
npx prisma migrate dev
cd ..
```

### 4. Run both Frontend and Backend concurrently
From the root directory:
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets**: [http://localhost:3000](http://localhost:3000)

Or run individually:
- `npm run dev:backend` (runs only `backend`)
- `npm run dev:frontend` (runs only `frontend`)

---

## Separate Deployment Guide

### Deploying the Backend Machine
Copy / deploy **only the `backend/` directory** to your backend hosting platform (e.g. Render, Railway, AWS, Fly.io, DigitalOcean).

1. **Environment Variables**:
   - `PORT`: e.g. `3000`
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Hosted PostgreSQL connection URL
   - `REDIS_URL`: Hosted Redis connection URL (e.g., Redis Cloud, Upstash)
   - `JWT_SECRET`: Random secure string
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app` (your frontend domain)
2. **Build Command**:
   ```bash
   npm ci && npm run build
   ```
3. **Start Command**:
   ```bash
   npx prisma migrate deploy && npm start
   ```

### Deploying the Frontend Machine
Copy / deploy **only the `frontend/` directory** to your static hosting platform (e.g. Vercel, Netlify, Cloudflare Pages, S3/CloudFront).

1. **Environment Variables** (set in hosting dashboard):
   - `VITE_API_URL`: `https://your-backend-api.com`
   - `VITE_SOCKET_URL`: `https://your-backend-api.com`
2. **Build Command**:
   ```bash
   npm run build
   ```
3. **Publish Directory**:
   `dist`

---

## Docker Support

### Run with Docker Compose
```bash
docker compose up --build
```
Runs the backend API, PostgreSQL, and Redis containers.
