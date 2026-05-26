import prisma from "./prisma";

export async function syncUserRoom(socket : any){
    const user = await prisma.user.findFirst({
        where : { id : socket.userId } ,
        include : {rooms : true}
    })

    if(!user) return null

    user.rooms.forEach(room => {
        socket.join(room.roomname)
    })
}