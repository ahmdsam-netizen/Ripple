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
    }
}