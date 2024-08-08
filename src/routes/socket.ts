import { Server } from "socket.io";

import {
  handleJoinRoom,
  handleSendMessage,
  handleTyping,
  handleStopTyping,
  handleRefresh,
  handleCreateChat,
  handleUploadImage,
  handleReactMessage,
  handleRemoveReaction,
} from "../controllers/messageController";
import { socketAuth } from "../middlewares/socketAuth";
import { updateIsOnline, updateUserLastPing } from "../services/messageService";

export const setupSocket = (io: Server) => {
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    console.log("A user connected");
    // Access the user ID from socket data
    const userId = socket.data.userId;

    updateIsOnline(userId, true);
    socket.on("create_chat", (data) => {
      handleCreateChat(socket, data);
    });

    socket.on("join_room", (data) => handleJoinRoom(socket, io, data));
    socket.on("send_message", (data) => handleSendMessage(io, data));
    socket.on("upload_image", (data) => {
      handleUploadImage(io, socket, data);
    });
    socket.on("react_message", (data) => handleReactMessage(io, data));
    socket.on("remove_reaction", (data) => handleRemoveReaction(io, data));
    socket.on("typing", (data) => handleTyping(io, socket, data));
    socket.on("stop_typing", (data) => handleStopTyping(io, socket, data));
    socket.on("refresh", (data) => handleRefresh(socket, data));

    socket.on("leave_room", (data) => {
      socket.leave(data.room);
      console.log(`User ${data.from_user} left room ${data.room}`);
    });
    socket.on("disconnect", () => {
      console.log("User disconnected");
      // Use the userId to update the last ping
      updateIsOnline(userId, false);
      updateUserLastPing(userId);
    });
  });
};
