import { Server } from "socket.io"
import next from "next"
import { createServer } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken"

const port = 3000 ;
const dev = process.env.NODE_ENV !== 'production'

const app = next({dev , port})
const handle = app.getRequestHandler() ;

const JWT_SECRET = process.env.JWT_SECRET!

app.prepare().then(() => {
    const httpServer = createServer((req , res) => {
        const parseUrl = parse(req.url! , true) ;
        handle(req , res , parseUrl)
    })

    const io = new Server(httpServer)

    io.on('connection' , (socket : any) => {
        socket.authenticated = false 

        socket.on('authenticate' , ({token} : {token : string}) => {
            try {
                const payload = jwt.verify(token , JWT_SECRET) as jwt.JwtPayload

                socket.authenticated = true ;
                socket.userId = payload.sub ;
                socket.userRole = payload.role ;

                socket.emit('authenticated' , {userId : payload.sub})

            } catch {
                socket.emit('auth_error' , { message : 'Invalid or expired token'})
                socket.disconnect(true)
            }
        })

        socket.onAny((event : any) => {
            if( event === 'authenticate' ) return 

            if(!socket.authenticated){
                socket.emit('auth_error' , {message : 'Not authenticated'})
                socket.disconnect(true)
            }
        })

        socket.on('message' , (data : {text : string}) => {
            io.emit('message' , {from : socket.userId , text : data.text})
        })
    })
    httpServer.listen(port , () => {
        console.log("Ready to listen at http://localhost:3000")
    })
})