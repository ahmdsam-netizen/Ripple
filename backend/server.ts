import "dotenv/config";
import { Server } from "socket.io"
import { createServer } from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import { initSocket } from "./socket";
import { connectRedis } from "@/redisClient";
import { setUpServerInstance, subscribeAllRoomChannels } from "@/chatHandler";
import authRoutes from "@/server/routes/auth";
import prisma from "@/lib/prisma";

const port = Number(process.env.PORT ?? 3000);
const instanceId = process.env.INSTANCE_ID ?? `port-${port}`;

// Default origins for local development - override with ALLOWED_ORIGINS in .env
const defaultOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "healthy", timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
    } catch (error) {
        res.status(503).json({ status: "unhealthy", error: error instanceof Error ? error.message : "Unknown error" });
    }
});

app.get("/", (_req, res) => {
    res.json({ message: "Ripple API and WebSocket server running" });
});


async function start() {

    const httpServer = createServer(app)

    // this attach or upgrade http server to web socket server that will handle all socket traffic
    // this is server instance
    const io = new Server(httpServer , {
        cors : {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }
                console.log(`Blocked socket CORS origin: ${origin}`);
                callback(new Error("Not allowed by CORS"));
            },
            methods: ["GET" , "POST"] ,
            credentials: true
        }
    })

    // Here redis connection is been established
    await connectRedis()
    
    // What really it does ?? -- as we cannot directly export io -- that's why we are using it 
    setUpServerInstance(io)

    // Subscribing to all the channels that i already have subscribed to -- with the help of db
    // this is helpful when receiving message from the other members 
    await subscribeAllRoomChannels()

    // Subscribe to global rooms channel for room deletion notifications
    const { subscribeToChannel } = await import("@/chatHandler")
    await subscribeToChannel(`global:rooms`)

    // this is after logic after connection of application
    initSocket(io) 

    httpServer.listen(port , () => {
        console.log(`[${instanceId}] API ready at http://localhost:${port}`)
        console.log(`[${instanceId}] Socket CORS origins: ${allowedOrigins.join(", ")}`)
    })
}

start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
