import roomHandler from "./handlers/roomHandler";
import userHandler from "./handlers/userHandler";
import messageHandler from "./handlers/messageHandler";
import { Server, Socket } from "socket.io"
import { syncUserRoom } from "@/lib/reconnect";
import { subscribeToChannel } from "@/chatHandler";
import { parseCookieHeader } from "@/lib/parseCookies";
import { AUTH_COOKIE, verifyToken } from "@/server/auth";

const handlers = [
    roomHandler ,
    userHandler ,
    messageHandler 
]

export function initSocket(io : Server){
    io.on('connection' , async (socket : Socket) => {
        // setting authentication to false then further authenticating the user 
        socket.data.authenticated = false ;

        // event to handle authentication of user when user hits this event 
        socket.on('authenticate' , async () => {
            try {
                const cookies = parseCookieHeader(socket.request.headers.cookie ?? "");
                const rawToken = cookies[AUTH_COOKIE];
                const token = rawToken ? verifyToken(rawToken) : null;

                if (!token?.id) {
                    console.log(
                        "Socket auth failed: no token",
                        socket.request.headers.cookie ? "cookie present" : "no cookie header"
                    );
                    socket.emit('auth_error', { message: 'Not authenticated' })
                    socket.disconnect(true)
                    return
                }

                socket.data.authenticated = true ;
                socket.data.userId = token.id ;
                socket.data.username = token.username ;
                socket.join(socket.data.userId) 

                try {
                    // is it nessecary to make all connection when application is getting started ?

                    // subscribing myself - for every thing -- also for one to one messaging
                    await subscribeToChannel(`user:${socket.data.userId}`)

                    // subscribing other users -- whom i am connected to
                    // do we need to make user subscribe -- only to do messaging ? 
                    await syncUserRoom(socket)

                } catch (redisError: unknown) {
                    const message = redisError instanceof Error ? redisError.message : String(redisError);
                    console.error("Socket auth: Redis/room sync failed:", message);
                }

                if (!socket.data.handlersRegistered) {
                    // all event are defined after this point 
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
