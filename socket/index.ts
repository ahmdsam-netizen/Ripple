import roomHandler from "./handlers/roomHandler";
import userHandler from "./handlers/userHandler";
import messageHandler from "./handlers/messageHandler";
import { NextApiRequest } from "next";
import { getToken } from "next-auth/jwt";
import { Server, Socket } from "socket.io"
import { syncUserRoom } from "@/lib/reconnect";
import { setUpRedisListener } from "@/chatHandler";
import { connectRedis } from "@/redisClient";

const handlers = [
    roomHandler ,
    userHandler ,
    messageHandler 
]

export function initSocket(io : Server){
    io.on('connection' , async (socket : Socket) => {
        socket.data.authenticated = false ;

        socket.on('authenticate' , async () => {
            try {

                const req = socket.request as unknown as NextApiRequest
                
                const token = await getToken({
                    req ,
                    secret : process.env.NEXTAUTH_SECRET!
                })

                if (!token || !token.id) {
                    socket.emit('auth_error', { message: 'Not authenticated' })
                    socket.disconnect(true)
                    return
                }

                socket.data.authenticated = true ;
                socket.data.userId = token.id ;
                socket.data.username = token.username ;
                socket.join(socket.data.userId) 


                await syncUserRoom(socket)
                handlers.forEach(handler => handler(io , socket))

                await connectRedis()
                setUpRedisListener(io)

                socket.emit('authenticated' , {id : socket.data.userId})

            } catch {
                socket.emit('auth_error' , { message : 'Invalid or expired token'})
                socket.disconnect(true)
            }
        })

        socket.onAny((event : any) => {
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