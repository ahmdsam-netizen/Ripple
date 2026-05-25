import { io , Socket } from "socket.io-client";

let socket : Socket | null = null ;

export function getSocket(): Socket{
    if(!socket){
        socket = io({autoConnect : false})
    }
    return socket
}

export async function connectWithAuth(getToken: () => string): Promise<Socket> {
    const socket = getSocket() ;
    
    return new Promise((resolve , reject) => {
        socket.connect() ;

        socket.on('connect' , () => {
            socket.emit('authenticated' , {token : getToken() })
        })
        socket.on('authenticate' , () => resolve(socket)) 
        socket.on('auth_error' , (err) => reject(new Error(err.message)))

    })
}