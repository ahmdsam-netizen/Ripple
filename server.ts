import "dotenv/config";
import { Server } from "socket.io"
import next from "next"
import { createServer } from "http";
import { parse } from "url";
import { initSocket } from "./socket";
import { connectRedis } from "@/redisClient";
import { setUpRedisListener, subscribeAllRoomChannels } from "@/chatHandler";

const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== 'production';
const instanceId = process.env.INSTANCE_ID ?? `port-${port}`;

const defaultOrigins = [
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

if (process.env.NEXTAUTH_URL && !allowedOrigins.includes(process.env.NEXTAUTH_URL)) {
    allowedOrigins.push(process.env.NEXTAUTH_URL);
}

const app = next({ dev, port })
const handle = app.getRequestHandler() ;

app.prepare().then(async () => {
    const httpServer = createServer((req , res) => {
        const parseUrl = parse(req.url! , true) ;
        handle(req , res , parseUrl)
    })

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

    await connectRedis()
    setUpRedisListener(io)
    await subscribeAllRoomChannels()
    initSocket(io) 

    httpServer.listen(port , () => {
        console.log(`[${instanceId}] Ready at ${process.env.NEXTAUTH_URL ?? `http://localhost:${port}`}`)
        console.log(`[${instanceId}] Socket CORS origins: ${allowedOrigins.join(", ")}`)
    })
})
