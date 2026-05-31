import prisma from "@/lib/prisma";
import { Server, Socket } from "socket.io";

export default function userHandler(io : Server , socket : Socket){
    try {
        socket.on('find_user' , async (data : {filter : string}) => {
            const getUsers = await prisma.user.findMany({
                where : {
                    username : {contains : data.filter , mode : "insensitive"}
                } ,
                take : 20
            })

            socket.emit('filter_room' , getUsers.map(user => ({
                username : user.username , 
                created_at : user.created_at ,
            })))
        })   
    } 
    catch (error : any) {
        console.log(error.message) ;
        socket.emit('error' , "Failed to fetch users")
    }

}