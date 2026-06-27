import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let connectingPromise: Promise<Socket> | null = null;

function getSocketUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SOCKET_URL ?? window.location.origin;
  }
  return undefined;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  connectingPromise = null;
}

export function connectWithAuth(): Promise<Socket> {
  const activeSocket = getSocket();

  if (connectingPromise) return connectingPromise;

  connectingPromise = new Promise((resolve, reject) => {
    const cleanup = () => {
      activeSocket.off("connect", onConnect);
      activeSocket.off("authenticated", onAuthenticated);
      activeSocket.off("auth_error", onAuthError);
      activeSocket.off("connect_error", onConnectError);
    };

    const onConnect = () => {
      activeSocket.emit("authenticate");
    };

    const onAuthenticated = () => {
      cleanup();
      connectingPromise = null;
      resolve(activeSocket);
    };

    const onAuthError = (err: { message: string }) => {
      cleanup();
      connectingPromise = null;
      reject(new Error(err.message));
    };

    const onConnectError = (error: Error) => {
      cleanup();
      connectingPromise = null;
      reject(new Error(error.message || "Socket connection failed"));
    };

    activeSocket.on("connect", onConnect);
    activeSocket.once("authenticated", onAuthenticated);
    activeSocket.once("auth_error", onAuthError);
    activeSocket.once("connect_error", onConnectError);

    if (!activeSocket.connected) {
      activeSocket.connect();
    } else {
      activeSocket.emit("authenticate");
    }
  });

  return connectingPromise;
}
