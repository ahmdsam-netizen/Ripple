import { Server } from "socket.io";
import { subscriber } from "./redisClient";
import { eventHandlers } from "./socket/handlers/pubsubEvents/eventRouter";
import prisma from "@/lib/prisma";

let io: Server;
const subscribedChannels = new Set<string>();

// track how many users on THIS server are in each channel
const channelRefCount = new Map<string, number>();

function routeRedisMessage(message: string, channel: string) {
    try {
        const parsed = JSON.parse(message);
        const { event_type } = parsed;

        const id = channel.split(":").pop();
        if (!id) return;

        type EventKey = keyof typeof eventHandlers;
        const handler = eventHandlers[event_type as EventKey];

        if (!handler) {
            console.log(`No handler for event_type: ${event_type}`);
            return;
        }

        handler(io, id, parsed);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`Error processing Redis message: ${msg}`);
    }
}

export function setUpServerInstance(server: Server) {
    io = server;
}

export async function subscribeToChannel(channel: string) {
    const count = channelRefCount.get(channel) ?? 0;

    if (count === 0) {
        // first user joining this channel on this server
        await subscriber.subscribe(channel, (message, channelName) => {
            routeRedisMessage(message, channelName);
        });
        subscribedChannels.add(channel);
        console.log(`Subscribed to Redis channel: ${channel}`);
    }

    channelRefCount.set(channel, count + 1);

}

export async function unsubscribeFromChannel(channel: string) {
    const count = channelRefCount.get(channel) ?? 0;
    
    if (count <= 1) {
        // LAST user leaving — now safe to unsubscribe
        await subscriber.unsubscribe(channel);
        subscribedChannels.delete(channel);
        channelRefCount.delete(channel);
    } else {
        // other users still here — just decrement
        channelRefCount.set(channel, count - 1);
    }
}

export function isSubscribed(channel: string) {
    return subscribedChannels.has(channel);
}

export async function subscribeAllRoomChannels() {
    const rooms = await prisma.room.findMany({ select: { id: true } });

    for (const room of rooms) {
        await subscribeToChannel(`room:${room.id}`);
    }

    console.log(`Subscribed to ${rooms.length} room channel(s) on this instance`);
}
