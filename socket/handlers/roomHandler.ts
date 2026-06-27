import { Server, Socket } from "socket.io"
import prisma from "@/lib/prisma"
import { createRoom , joinRoom , leaveRoom } from "./pubsubEvents/pubsubFunctions"

export default function (io : Server , socket : Socket){
    socket.on('create_room' , async (data : {roomname : string , description : string }) => {
        try {
            await createRoom(socket , data) 
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to create room"})
        }
        
    })

    socket.on('join_room' , async (data : {roomname : string}) => {
        try {
            await joinRoom(socket , data)
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to join room"})
        }


    })

    socket.on('leave_room' , async (data : {roomname : string}) => {
        try {
            await leaveRoom(socket , data) 
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to leave room"})
        }
        
    })

    socket.on('list_room' , async (data : {filter : string}) => {
        try {
            const getRooms = await prisma.room.findMany({
                where : {
                    roomname : {contains : data.filter , mode : "insensitive"}
                } , 
                include : {
                    _count : {select : {author : true}}
                }
            })

            socket.emit('filter_rooms' , getRooms.map(room => ({
                roomname : room.roomname , 
                admin : room.created_by ,
                created_at : room.created_at ,
                members : room._count.author
            })))

        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , "Failed to list rooms")
        }
    })
}