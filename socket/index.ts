import roomHandler from "./handlers/roomHandler";
import userHandler from "./handlers/userHandler";
import messageHandler from "./handlers/messageHandler";
import { NextApiRequest } from "next";
import { getToken } from "next-auth/jwt";
import { Server } from "socket.io"
import { syncUserRoom } from "@/lib/reconnect";

const handlers = [
    roomHandler ,
    userHandler ,
    messageHandler 
]

export function initSocket(io : Server){
    io.on('connection' , async (socket : any) => {
        socket.authenticated = false ;

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

                socket.authenticated = true ;
                socket.userId = token.id ;
                socket.username = token.username ;

                socket.emit('authenticated' , {id : socket.userId})

            } catch {
                socket.emit('auth_error' , { message : 'Invalid or expired token'})
                socket.disconnect(true)
            }
        })

        socket.onAny((event : any) => {
            if( event === 'authenticate' ) return 

            if(!socket.authenticated){
                socket.emit('auth_error' , {message : 'Not authenticated'})
                socket.disconnect(true)
            }
        })

        await syncUserRoom(socket)

        handlers.forEach(handler => handler(io , socket))

        socket.on('disconnect' , () => {
            console.log(`${socket.username} disconnected`)
        })
    })
}