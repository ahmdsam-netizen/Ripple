import { Server } from "socket.io"
import prisma from "@/lib/prisma"

export default function (io : Server , socket : any){
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
                    connect : { id : socket.userId }
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
                    disconnect : { id : socket.userId }
                }
            }
        })

        socket.leave(existingRoom.roomname)
    })

    

    socket.on('list_room' , async (data : {filter : string}) => {
        const getRooms = await prisma.room.findMany({
            where : {
                roomname : {contains : data.filter , mode : "insensitive"}
            }
        })

        socket.emit('filter_room' , getRooms.map(room => ({
            roomname : room.roomname , 
            admin : room.created_by ,
            created_at : room.created_at ,
        })))
    })
}