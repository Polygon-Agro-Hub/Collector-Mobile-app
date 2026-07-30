import { io, Socket } from "socket.io-client";
import { environment } from "@/environment/environment";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const serverUrl =
      environment.API_BASE_URL.split("/agro-api")[0] || "http://localhost:3000";
    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
};
