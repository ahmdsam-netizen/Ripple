import { Socket } from "socket.io";
import prisma from "./prisma";

export async function syncUserRoom(socket : Socket){
    const user = await prisma.user.findFirst({
        where : { id : socket.data.userId } ,
        include : {rooms : true}
    })

    if(!user) return null

    user.rooms.forEach(room => {
        socket.join(room.id)
    })
}