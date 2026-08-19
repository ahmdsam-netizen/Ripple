import { Server } from "socket.io";

export const eventHandlers = {
    'typing' : (io : Server , id : string , parsed : any) => {
        return io.to(id).emit('typing' , parsed) ;
    },
    'chat' : (io : Server , id : string , parsed : any) => {
        return io.to(id).emit('chat' , parsed) ;
    },
    'join' : (io : Server , id : string , parsed : any) => {
        return io.to(id).emit('join' , parsed) ;
    },
    'leave' : (io : Server , id : string , parsed : any) => {
        return io.to(id).emit('leave' , parsed) ;
    },
    'room_deleted' : (io : Server , id : string , parsed : any) => {
        // Broadcast to ALL connected users globally to update their search results
        return io.emit('room_deleted' , parsed) ;
    }
}