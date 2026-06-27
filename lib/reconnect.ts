import { Socket } from "socket.io";
import prisma from "./prisma";
import { subscribeToChannel } from "@/chatHandler";

export async function syncUserRoom(socket : Socket){
    const user = await prisma.user.findFirst({
        where : { id : socket.data.userId } ,
        include : {rooms : true}
    })

    if(!user) return null

    for (const room of user.rooms) {
        socket.join(room.id)
        await subscribeToChannel(`room:${room.id}`)
    }
}
