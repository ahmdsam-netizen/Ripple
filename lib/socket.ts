import { io , Socket } from "socket.io-client";

let socket : Socket | null = null ;

export function getSocket(): Socket{
    if(!socket){
        socket = io({
            autoConnect : false , 
            withCredentials : true ,
        })
    }
    return socket
}

export async function connectWithAuth(): Promise<Socket> {
    const socket = getSocket() ;
    
    return new Promise((resolve , reject) => {
        socket.connect() ;

        socket.on('connect' , () => {
            socket.emit('authenticate')
        })
        socket.on('authenticated' , () => resolve(socket)) 
        socket.on('auth_error' , (err) => reject(new Error(err.message)))

    })
}