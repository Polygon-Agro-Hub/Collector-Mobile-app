import { io, Socket } from "socket.io-client";
import environment from "@/environment/environment";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    let serverUrl = "http://localhost:3000";
    try {
      const parsed = new URL(environment.API_BASE_URL);
      serverUrl = `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      serverUrl = environment.API_BASE_URL.split("/agro-api")[0] || "http://localhost:3000";
    }

    console.log("Connecting Socket.IO to:", serverUrl);

    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      secure: serverUrl.startsWith("https"),
    });

    socket.on("connect", () => {
      console.log("Socket connected successfully to:", serverUrl);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }
  return socket;
};
