import { Socket, Server } from "socket.io";
import { MessageProps } from "../types";
import {
  createMessage,
  getRoomMessages,
  joinRoom,
} from "../services/messageService";

export const handleJoinRoom = async (
  socket: Socket,
  data: { from_user: string; room: string }
) => {
  const { from_user, room } = data;
  try {
    console.log(`${from_user} joined room ${room}`);

    await joinRoom(from_user, room);

    socket.join(room);

    const messages = await getRoomMessages(room);
    socket.emit("history_messages", messages);
  } catch (error) {
    console.error(`Error in handleJoinRoom: ${error}`);
    socket.emit("error", { message: "Failed to join room" });
  }
};

export const handleSendMessage = async (io: Server, data: MessageProps) => {
  const { content, from_user, room } = data;
  try {
    io.in(room).emit("receive_message", data);
    await createMessage(from_user, room, content);
  } catch (error) {
    console.error(`Error in handleSendMessage: ${error}`);
    io.in(room).emit("error", { message: "Failed to send message" });
  }
};

export const handleTyping = (
  socket: Socket,
  data: { room: string; username: string }
) => {
  try {
    socket.to(data.room).emit("user_typing", { username: data.username });
  } catch (error) {
    console.error(`Error in handleTyping: ${error}`);
    socket.emit("error", { message: "Failed to broadcast typing status" });
  }
};

export const handleStopTyping = (
  socket: Socket,
  data: { room: string; username: string }
) => {
  try {
    socket.to(data.room).emit("user_stop_typing", { username: data.username });
  } catch (error) {
    console.error(`Error in handleStopTyping: ${error}`);
    socket.emit("error", { message: "Failed to broadcast stop typing status" });
  }
};

export const handleRefresh = async (
  socket: Socket,
  data: { from_user: string; room: string }
) => {
  const { from_user, room } = data;
  try {
    console.log("Refreshing", from_user, room);

    const messages = await getRoomMessages(room);
    socket.emit("history_messages", messages);
  } catch (error) {
    console.error(`Error in handleRefresh: ${error}`);
    socket.emit("error", { message: "Failed to refresh messages" });
  }
};
