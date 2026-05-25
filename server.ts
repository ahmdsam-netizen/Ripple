import { Server } from "socket.io"
import next, { NextApiRequest } from "next"
import { createServer } from "http";
import { parse } from "url";
import { getToken } from "next-auth/jwt";
import prisma from "./lib/prisma";

const port = 3000 ;
const dev = process.env.NODE_ENV !== 'production'

const app = next({dev , port})
const handle = app.getRequestHandler() ;

const JWT_SECRET = process.env.JWT_SECRET!

app.prepare().then(() => {
    const httpServer = createServer((req , res) => {
        const parseUrl = parse(req.url! , true) ;
        handle(req , res , parseUrl)
    })

    const io = new Server(httpServer)

    io.on('connection' , (socket : any) => {
        socket.authenticated = false 

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

        socket.on('create_room' , async (data : {roomname : string , description : string , owner : string}) => {
            const existingRoom = await prisma.room.findFirst({
                where : {roomname : data.roomname}
            })            

            if(existingRoom) return null 

            const room = await prisma.room.create({
                data : {
                    roomname : data.roomname , 
                    description : data.description ,
                    created_by : socket.username ,
                    author : {
                        connect : {id : socket.userId}
                    }
                }
            })
            socket.join(room.roomname)
        })

        socket.on('join_room' , async (data : {roomname : string}) => {
            const existingRoom = await prisma.room.findFirst({
                where : {roomname : data.roomname}
            })            

            if(!existingRoom) return null 

            await prisma.room.update({
                where : {roomname : data.roomname} ,
                data : {
                    author : {
                        connect : {id : socket.userId}
                    }
                }
            })

            socket.join(existingRoom.roomname)
        })

        socket.on('leave_room' , async (data : {roomname : string}) => {
            const existingRoom = await prisma.room.findFirst({
                where : {roomname : data.roomname}
            })            

            if(!existingRoom) return null 

            await prisma.room.update({
                where : {roomname : data.roomname} ,
                data : {
                    author : {
                        disconnect : {id : socket.userId}
                    }
                }
            })

            socket.leave(existingRoom.roomname)

        })

        socket.on('message' , async (data : {text : string , roomId : string}) => {
            const room = await prisma.room.findFirst({
                where : {
                    id : data.roomId
                }
            })

            if(!room) return null 

            const message = await prisma.message.create({
                data : {
                    content : data.text ,
                    room_id : data.roomId ,
                    user_id : socket.userId
                }
            })
            io.to(room.roomname).emit('message' , {from : socket.username , text : message.content , to : data.roomId})
        })
    })
    httpServer.listen(port , () => {
        console.log("Ready to listen at http://localhost:3000")
    })
})