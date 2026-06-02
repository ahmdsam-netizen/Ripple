import prisma from "@/lib/prisma"
import { publisher, subscriber } from "@/redisClient"
import { Socket } from "socket.io"

const subscribedRoom = new Set() ;

// Helper function for publishing events with error handling
async function publishEvent(channel: string, payload: any) {
    try {
        const numSubscribers = await publisher.publish(channel, JSON.stringify(payload))
        if (numSubscribers === 0) {
            console.log(`No subscribers for channel: ${channel}`)
        }
        return numSubscribers
    } catch (error: any) {
        console.error(`Failed to publish to ${channel}:`, error.message)
        throw error
    }
}

// Helper function for message validation
function validateMessage(text: string, maxLength: number = 5000): { valid: boolean; error?: string } {
    if (!text || typeof text !== 'string') {
        return { valid: false, error: 'Message must be a string' }
    }
    
    const trimmed = text.trim()
    if (trimmed.length === 0) {
        return { valid: false, error: 'Message cannot be empty' }
    }
    
    if (trimmed.length > maxLength) {
        return { valid: false, error: `Message exceeds maximum length of ${maxLength} characters` }
    }
    
    return { valid: true }
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

        const payload = {
            event_type: 'typing',
            username : socket.data.username , 
            roomname : checkRoom.roomname
        }

        await publishEvent(`room:${checkRoom.id}` , payload)
        
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

        const payload = {
            event_type: 'typing',
            username : socket.data.username
        }
        await publishEvent(`user:${checkUser.id}` , payload)

    } catch (error : any) {
        socket.emit('error' , {message : "Failed to get loaded"})
    }
}



export async function sendRoomMessage(socket : Socket , data : {text : string , roomname : string}){

    try {
        const validation = validateMessage(data.text)
        if (!validation.valid) {
            socket.emit('error' , { message : validation.error })
            return
        }

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
        const payload = {
            event_type: 'chat',
            chat_type: 'room',
            from : socket.data.username , 
            text : message.content , 
            to : room.roomname , 
            sent_at : message.sent_at 
        }

        await publishEvent(`room:${room.id}` , payload)
    } catch (error : any) {
        console.log(error.message)
        socket.emit('error' , {message : "Failed send message"})
    }
}



export async function sendDirectMessage(socket : Socket , data : {text : string , otheruser : string}){
    try {
        const validation = validateMessage(data.text)
        if (!validation.valid) {
            socket.emit('error' , { message : validation.error })
            return
        }

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
        const payload = {
            event_type: 'chat',
            chat_type: 'direct',
            from : socket.data.username , 
            text : message.content , 
            to : otherUser.username ,
            sent_at : message.sent_at ,
        }

        await publishEvent(`user:${otherUser.id}` , payload)
        
    } catch (error : any){
        console.log(error.message)
        socket.emit('error' , {message : "Failed to send message"})
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

        await subscriber.subscribe(`room:${room.id}` , () => {})
        subscribedRoom.add(`room:${room.id}`) 

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

        const payload = {
            event_type: 'join',
            username : socket.data.username
        }
        await publishEvent(`room:${existingRoom.id}` , payload)

        if(!subscribedRoom.has(`room:${existingRoom.id}`)){
            await subscriber.subscribe(`room:${existingRoom.id}` , () => {})
            subscribedRoom.add(`room:${existingRoom.id}`)
            console.log(`Server subscribed to Redis channel: room:${existingRoom.id}`);
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

        const payload = {
            event_type: 'leave',
            username : socket.data.username
        }

        await publishEvent(`room:${existingRoom.id}` , payload)

        // Unsubscribe from Redis channel when no one is listening
        // TODO: Optimize this to unsubscribe only when no users remain in room
        await subscriber.unsubscribe(`room:${existingRoom.id}`)
        subscribedRoom.delete(`room:${existingRoom.id}`)

    } catch (error : any) {
        console.log(error.message)
        socket.emit('error' , {message : "Failed to leave room"})
    }
}