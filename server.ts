import { Server } from "socket.io"
import next from "next"
import { createServer } from "http";
import { parse } from "url";
import { initSocket } from "./socket";

const port = 3000 ;
const dev = process.env.NODE_ENV !== 'production'

const app = next({dev , port})
const handle = app.getRequestHandler() ;

app.prepare().then(() => {
    const httpServer = createServer((req , res) => {
        const parseUrl = parse(req.url! , true) ;
        handle(req , res , parseUrl)
    })

    const io = new Server(httpServer)

    initSocket(io) 

    httpServer.listen(port , () => {
        console.log("Ready to listen at http://localhost:3000")
    })
})