import {createClient} from "redis"

export const publisher = createClient({url : 'redis://localhost:6379'})
export const subscriber = createClient({url : 'redis://localhost:6379'})

export async function connectRedis(){
    try {
        await publisher.connect() ;
        await subscriber.connect() ;
        console.log('Redis pub/sub clients are connected')      
    } 
    catch (error : any) {
        console.log(error.message)
    }
}

