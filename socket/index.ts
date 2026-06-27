import roomHandler from "./handlers/roomHandler";
import userHandler from "./handlers/userHandler";
import messageHandler from "./handlers/messageHandler";
import { NextApiRequest } from "next";
import { getToken } from "next-auth/jwt";
import { Server, Socket } from "socket.io"
import { syncUserRoom } from "@/lib/reconnect";
import { subscribeToChannel } from "@/chatHandler";
import { parseCookieHeader } from "@/lib/parseCookies";

const handlers = [
    roomHandler ,
    userHandler ,
    messageHandler 
]

function buildAuthRequest(socket: Socket): NextApiRequest {
    const cookieHeader = socket.request.headers.cookie ?? "";
    return {
        headers: {
            cookie: cookieHeader,
        },
        cookies: parseCookieHeader(cookieHeader),
    } as unknown as NextApiRequest;
}

export function initSocket(io : Server){
    io.on('connection' , async (socket : Socket) => {
        socket.data.authenticated = false ;

        socket.on('authenticate' , async () => {
            try {
                const req = buildAuthRequest(socket);
                const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

                const token = await getToken({
                    req ,
                    secret : process.env.NEXTAUTH_SECRET!,
                    secureCookie,
                })

                if (!token || !token.userId) {
                    console.log(
                        "Socket auth failed: no token",
                        socket.request.headers.cookie ? "cookie present" : "no cookie header"
                    );
                    socket.emit('auth_error', { message: 'Not authenticated' })
                    socket.disconnect(true)
                    return
                }

                socket.data.authenticated = true ;
                socket.data.userId = token.userId ;
                socket.data.username = token.username ;
                socket.join(socket.data.userId) 

                try {
                    await subscribeToChannel(`user:${socket.data.userId}`)
                    await syncUserRoom(socket)
                } catch (redisError: unknown) {
                    const message = redisError instanceof Error ? redisError.message : String(redisError);
                    console.error("Socket auth: Redis/room sync failed:", message);
                }

                if (!socket.data.handlersRegistered) {
                    handlers.forEach(handler => handler(io , socket))
                    socket.data.handlersRegistered = true
                }

                socket.emit('authenticated' , {id : socket.data.userId})

            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("Socket auth error:", message);
                socket.emit('auth_error' , { message : 'Invalid or expired token'})
                socket.disconnect(true)
            }
        })

        socket.onAny((event : string) => {
            if( event === 'authenticate' ) return 

            if(!socket.data.authenticated){
                socket.emit('auth_error' , {message : 'Not authenticated'})
                socket.disconnect(true)
            }
        })


        socket.on('disconnect' , () => {
            console.log(`${socket.data.username} disconnected`)
        })
    })
}
