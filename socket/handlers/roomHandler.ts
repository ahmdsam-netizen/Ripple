import { Server } from "socket.io"
import prisma from "@/lib/prisma"

export default function (io : Server , socket : any){
    socket.on('create_room' , async (data : {roomname : string , description : string , owner : string}) => {
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
                    created_by : socket.username ,
                    author : {
                        connect : {id : socket.userId}
                    }
                }
            })

            socket.join(room.id)
            socket.emit('room_created' , {roomname : room.roomname})
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to create room"})
        }
        
    })

    socket.on('join_room' , async (data : {roomname : string}) => {
        try {
            const existingRoom = await prisma.room.findFirst({
                where : {roomname : data.roomname} ,
                include : {
                    author : {where : {id : socket.userId}}
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
                        connect : { id : socket.userId }
                    }
                }
            })
            socket.join(existingRoom.id)
            socket.emit('joined_room' , {roomname : existingRoom.roomname})
            socket.to(existingRoom.id).emit('user_joined' , { username : socket.username})
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to join room"})
        }


    })

    socket.on('leave_room' , async (data : {roomname : string}) => {
        try {
            const existingRoom = await prisma.room.findFirst({
                where : {roomname : data.roomname} ,
                include : {
                    author : {where : {id : socket.userId}}
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
                        disconnect : { id : socket.userId }
                    }
                }
            })

            socket.leave(existingRoom.id)
            socket.emit('lefted_room' , {roomname : existingRoom.roomname})
            socket.to(existingRoom.id).emit('user_left' , {username : socket.username})
        } catch (error : any) {
            console.log(error.message)
            socket.emit('error' , {message : "Failed to join room"})
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

            socket.emit('filter_room' , getRooms.map(room => ({
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