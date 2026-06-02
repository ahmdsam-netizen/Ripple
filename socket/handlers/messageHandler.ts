import { Server, Socket } from "socket.io"
import prisma from "@/lib/prisma"
import { typingInRoom , sendDirectMessage , sendRoomMessage , typingToUser } from "./pubsubEvents/pubsubFunctions"

export default function messageHandler(io : Server , socket : Socket){
    socket.on('message_in_room' , async (data : {text : string , roomname : string}) => {
        try {
            await sendRoomMessage(socket , data)
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed send message"})
        }
    })

    socket.on('message_to_user' , async (data : {otheruser : string , text : string}) => {
        try {
            await sendDirectMessage(socket , data)
        } catch (error : any){
            console.log(error.message)
            socket.emit('error' , {message : "Failed to send message"})
        }
    })


    socket.on('typing_to_user' , async (data : {username : string}) => {
        try {
            await typingToUser(socket , data)
        } catch (error : any) {
            socket.emit('error' , {message : "Failed to get loaded"})
        }
    })


    socket.on('typing_in_room' , async (data : {roomname : string}) => {
        try {
            await typingInRoom(socket , data) 
        } catch (error : any) {
            socket.emit('error' , {message : "Failed to get loaded"})
        }
    })

    socket.on('get_message_of_room' , async (data : {roomname : string}) => {
        try {
            const getRoom = await prisma.room.findFirst({
                where : { roomname : data.roomname } ,
                include : {author : {where : {id : socket.data.userId}}}
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
                            {sender_id : getUser.id , receiver_id : socket.data.userId} , 
                            {sender_id : socket.data.userId , receiver_id : getUser.id} , 
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

}
