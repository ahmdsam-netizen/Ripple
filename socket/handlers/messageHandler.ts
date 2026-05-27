import { Server } from "socket.io"
import prisma from "@/lib/prisma"

export default function messageHandler(io : Server , socket : any){
    socket.on('message_in_room' , async (data : {text : string , roomname : string}) => {
        try {
            const room = await prisma.room.findFirst({
                where : {roomname : data.roomname} ,
                include : {author : {where :  {id : socket.userId}}}
            })

            if(!room) {
                socket.emit('error' , { message : "Room does not exists or not a member"})
                return 
            }

            const message = await prisma.roomMessage.create({
                data : {
                    content : data.text ,
                    room_id : room.id ,
                    user_id : socket.userId ,
                }
            })
            io.to(room.id).emit('room_message' , {
                from : socket.username , 
                text : message.content , 
                to : room.roomname , 
                sent_at : message.sent_at 
            })
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed send message"})
        }

    })

    socket.on('get_message_of_room' , async (data : {roomname : string}) => {
        try {
            const getRoom = await prisma.room.findFirst({
                where : { roomname : data.roomname } ,
                include : {author : {where : {id : socket.userId}}}
            })

            if(!getRoom) {
                socket.emit('error' , { message : "Room does not exists or not a member"})
                return 
            }

            const last50Message = await prisma.roomMessage.findMany({
                where : { room_id : getRoom.id } , 
                include : {user : {select : {username : true}}} ,
                orderBy : { sent_at : "desc"},
                take : 50
            }).then(message => message.reverse())

            socket.emit('group_chat' , last50Message.map(message => ({
                content : message.content ,
                sent_at : message.sent_at ,
                sent_by : message.user.username ,
                sent_to : getRoom.roomname 
            })))

        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to fetch messages"})
        }
    })

    socket.on('typing_in_room' , async (data : {roomname : string}) => {
        try {
            const checkRoom = await prisma.room.findFirst({
                where : {roomname : data.roomname , author : {some : {id : socket.userId}}}
            })

            if(!checkRoom) {
                socket.emit('error' , {message : "Room not exists or not a memeber"})
                return 
            }

            socket.to(checkRoom.id).emit('user_typing' , {
                username : socket.username , 
                roomname : checkRoom.roomname
            })
        } catch (error : any) {
            socket.emit('error' , {message : "Failed to get loaded"})
        }
    })



    socket.on('message_to_user' , async (data : {otheruser : string , text : string}) => {
        try {
            const otherUser = await prisma.user.findFirst({
                where : {username : data.otheruser}
            })
            
            if(!otherUser){
                socket.emit('error' , {message : "User does not exists"})
                return
            }
            
            const message = await prisma.directMessage.create({
                data : {
                    content : data.text ,
                    sender_id : socket.userId , 
                    receiver_id : otherUser.id ,
                }
            })
            io.to(otherUser.id).emit('direct_message' , {
                from : socket.username , 
                text : message.content , 
                to : otherUser.username ,
                sent_at : message.sent_at ,
            })
            
        } catch (error : any){
            console.log(error.message)
            socket.emit('error' , {message : "Failed to send message"})
        }
    })

    socket.on('get_message_of_user' , async (data : {username : string}) => {
        try {
            const getUser = await prisma.user.findFirst({
                where : { username : data.username }
            })

            if(!getUser) {
                socket.emit('error' , { message : "User does not exists"})
                return 
            }

            const last50Message = await prisma.directMessage.findMany({
                where : {
                    AND : [{
                        OR : [
                            {sender_id : getUser.id , receiver_id : socket.userId} , 
                            {sender_id : socket.userId , receiver_id : getUser.id} , 
                        ]}
                    ]
                } , 
                include : {
                    sender : {select : {username : true}}  , 
                    receiver : {select : {username : true}}
                } ,
                orderBy : { sent_at : "desc"},
                take : 50
            }).then(message => message.reverse())

            socket.emit('direct_chat' , last50Message.map(message => ({
                content : message.content ,
                sent_at : message.sent_at ,
                sent_by : message.sender.username ,
                sent_to : message.receiver.username , 
            })))

        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to fetch messages"})
        }
    })


    socket.on('typing_to_user' , async (data : {username : string}) => {
        try {
            const checkUser = await prisma.user.findFirst({
                where : {username : data.username , } ,
            })

            if(!checkUser) {
                socket.emit('error' , {message : "User not found"})
                return 
            }

            socket.to(checkUser.id).emit('user_typing' , {username : socket.username})
        } catch (error : any) {
            socket.emit('error' , {message : "Failed to get loaded"})
        }
    })
}
