import { Server, Socket } from "socket.io";
import { subscriber , publisher , connectRedis } from "./redisClient";
import prisma from "./lib/prisma";

const subscribedRoom = new Set() ;

export function setUpRedisListener(io : Server){
    subscriber.on('message' , (channel : any , message : string) => {
        const id = channel.split(':')[2] ;
        const type = channel.split(':')[1] ;
        const parsed = JSON.parse(message) 

        if(type == "room")
            io.to(id).emit('message_in_room' , parsed)
        else 
            io.to(id).emit('message_to_user' , parsed) 
    })
}

export async function typingInRoom(socket : Socket , data : {roomname : string}){
    try {
        const checkRoom = await prisma.room.findFirst({
            where : {roomname : data.roomname , author : {some : {id : socket.data.userId}}}
        })

        if(!checkRoom) {
            socket.emit('error' , {message : "Room not exists or not a memeber"})
            return 
        }

        const payload = JSON.stringify({
            username : socket.data.username , 
            roomname : checkRoom.roomname
        })

        await publisher.publish(`typing:room:${checkRoom.id}` , payload)
        
    } catch (error : any) {
        socket.emit('error' , {message : "Failed to get loaded"})
    }
}

export async function typingToUser(socket : Socket , data : {username : string}){
    try {
        const checkUser = await prisma.user.findFirst({
            where : {username : data.username , } ,
        })

        if(!checkUser) {
            socket.emit('error' , {message : "User not found"})
            return 
        }

        const payload = JSON.stringify({username : socket.data.username})
        await publisher.publish(`typing:user:${checkUser.id}` , payload)

    } catch (error : any) {
        socket.emit('error' , {message : "Failed to get loaded"})
    }
}

export async function createRoom(socket : Socket , data : {roomname : string , description : string}){
    try {
        const existingRoom = await prisma.room.findFirst({
            where : {roomname : data.roomname}
        })            

        if(existingRoom) {
            socket.emit('error' , { message : "Room already exists"})
            return 
        }

        const room = await prisma.room.create({
            data : {
                roomname : data.roomname , 
                description : data.description ,
                created_by : socket.data.username ,
                author : {
                    connect : {id : socket.data.userId}
                }
            }
        })

        socket.join(room.id)
        socket.emit('room_created' , {roomname : room.roomname})

        await subscriber.subscribe(room.id , () => {})  // do i really need this point
        subscribedRoom.add(room.id) 

    } catch (error : any) {
        console.log(error.message)
        socket.emit('error' , {message : "Failed to create room"})
    }
}

export async function joinRoom(socket : Socket , data : {roomname : string}){
    try {
        const existingRoom = await prisma.room.findFirst({
            where : {roomname : data.roomname} ,
            include : {
                author : {where : {id : socket.data.userId}}
            }
        })            

        if(!existingRoom) {
            socket.emit('error' , {message : "Room doesn't exists"})
            return
        }

        if(existingRoom.author.length > 0) {
            socket.emit('error' , {message : "Aready a member"})
            return
        }

        await prisma.room.update({
            where : {roomname : data.roomname} ,
            data : {
                author : {
                    connect : { id : socket.data.userId }
                }
            }
        })
        socket.join(existingRoom.id)
        socket.emit('joined_room' , {roomname : existingRoom.roomname})

        const payload = JSON.stringify({ username : socket.data.username})
        await publisher.publish(`join:room:${existingRoom.id}` , payload)

        if(!subscribedRoom.has(existingRoom.id)){
            await subscriber.subscribe(existingRoom.id , () => {})
            subscribedRoom.add(existingRoom.id)
            console.log(`Server subscribed to Redis channel: chat:${existingRoom}`);
        }
    } catch (error : any) {
        console.log(error.message)
        socket.emit('error' , {message : "Failed to join room"})
    }
}

export async function leaveRoom(socket : Socket , data : {roomname : string}){
    try {
        const existingRoom = await prisma.room.findFirst({
            where : {roomname : data.roomname} ,
            include : {
                author : {where : {id : socket.data.userId}}
            }
        })            

        if(!existingRoom){
            socket.emit('error' , {message : "Room doesn't exists"})
            return     
        }

        if(existingRoom.author.length === 0){
            socket.emit('error' , {message : "Not a member of this group"})
            return
        }

        await prisma.room.update({
            where : {roomname : data.roomname} ,
            data : {
                author : {
                    disconnect : { id : socket.data.userId }
                }
            }
        })

        socket.leave(existingRoom.id)
        socket.emit('left_room' , {roomname : existingRoom.roomname})

        const payload = JSON.stringify({username : socket.data.username})

        await publisher.publish(`leave:room:${existingRoom.id}` , payload)

    } catch (error : any) {
        console.log(error.message)
        socket.emit('error' , {message : "Failed to leave room"})
    }
}


export async function sendRoomMessage(socket : Socket , data : {text : string , roomname : string}){

    try {
        const room = await prisma.room.findFirst({
            where : {
                roomname : data.roomname ,
                author : {some :  {id : socket.data.userId}}}
        })

        if(!room) {
            socket.emit('error' , { message : "Room does not exists or not a member"})
            return 
        }

        const message = await prisma.roomMessage.create({
            data : {
                content : data.text ,
                room_id : room.id ,
                user_id : socket.data.userId ,
            }
        })
        const payload = JSON.stringify({
            from : socket.data.username , 
            text : message.content , 
            to : room.roomname , 
            sent_at : message.sent_at 
        })

        await publisher.publish(`chat:room:${room.id}` , payload)
    } catch (error : any) {
        console.log(error.message)
        socket.emit('error' , {message : "Failed send message"})
    }
}


export async function sendDirectMessage(socket : Socket , data : {text : string , otheruser : string}){
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
                sender_id : socket.data.userId , 
                receiver_id : otherUser.id ,
            }
        })
        const payload = JSON.stringify({
            from : socket.data.username , 
            text : message.content , 
            to : otherUser.username ,
            sent_at : message.sent_at ,
        })

        await publisher.publish(`chat:user:${otherUser.id}` , payload)
        
    } catch (error : any){
        console.log(error.message)
        socket.emit('error' , {message : "Failed to send message"})
    }
}