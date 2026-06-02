import { Server } from "socket.io";
import { subscriber } from "./redisClient";
import { eventHandlers } from "./socket/handlers/pubsubEvents/eventRouter";


export function setUpRedisListener(io : Server){
    subscriber.on('message' , (channel : any , message : string) => {
        try {
            const parsed = JSON.parse(message) ;
            const { event_type } = parsed ;

            const parts = channel.split(':');
            const id = parts.pop();

            type EventKey = keyof typeof eventHandlers;
            const handler = eventHandlers[event_type as EventKey];

            if(!handler){
                console.log(`No handler for event_type: ${event_type}`);
                return;
            }

            handler(io , id , parsed);
        } catch (error: any) {
            console.log(`Error processing Redis message: ${error.message}`);
        }
    });
}



