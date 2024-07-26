import { Server } from "socket.io";

import {
  handleJoinRoom,
  handleSendMessage,
  handleTyping,
  handleStopTyping,
  handleRefresh,
} from "../controllers/messageController";
import { socketAuth } from "../middlewares/socketAuth";

export const setupSocket = (io: Server) => {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("join_room", (data) => handleJoinRoom(socket, data));
    socket.on("send_message", (data) => handleSendMessage(io, data));
    socket.on("typing", (data) => handleTyping(socket, data));
    socket.on("stop_typing", (data) => handleStopTyping(socket, data));
    socket.on("refresh", (data) => handleRefresh(socket, data));

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
