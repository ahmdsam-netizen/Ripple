import { Server } from "socket.io"
import prisma from "@/lib/prisma"

export default function messageHandler(io : Server , socket : any){
    socket.on('message_in_room' , async (data : {text : string , roomId : string}) => {
        const room = await prisma.room.findFirst({
            where : {
                id : data.roomId
            }
        })

        if(!room) return null 

        const message = await prisma.roomMessage.create({
            data : {
                content : data.text ,
                room_id : data.roomId ,
                user_id : socket.userId
            }
        })
        io.to(room.roomname).emit('room_message' , {from : socket.username , text : message.content , to : room.roomname})
    })

    socket.on('message_in_room' , async (data : {roomname : string}) => {
        const getRoom = await prisma.room.findFirst({
            where : { roomname : data.roomname }
        })

        if(!getRoom) return null 

        const last50Message = await prisma.roomMessage.findMany({
            where : { room_id : getRoom.id } , 
            include : {user : true} ,
            orderBy : { sent_at : "desc"},
            take : 50
        }).then(message => message.reverse())

        socket.emit('last50Message' , last50Message.map(message => ({
            content : message.content ,
            sent_at : message.sent_at ,
            sent_by : message.user.username ,
            sent_to : getRoom.roomname 
        })))
    })

    socket.on('message_to_user' , async (data : {otheruser : string , text : string}) => {
        const otherUser = await prisma.user.findFirst({
            where : {username : data.otheruser}
        })
        
        if(!otherUser) return null 

        const message = await prisma.directMessage.create({
            data : {
                content : data.text ,
                sender_id : socket.userId , 
                receiver_id : otherUser.id ,
            }
        })

        io.to(otherUser.id).emit('room_message' , {from : socket.username , text : message.content , to : otherUser.username})
    })
}
