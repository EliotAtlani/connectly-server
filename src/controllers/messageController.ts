import { Socket, Server } from "socket.io";
import { MessageProps } from "../types";
import {
  createChat,
  createMessage,
  getRoomMessages,
  RefreshConversation,
} from "../services/messageService";

export const handleJoinRoom = async (
  socket: Socket,
  data: { from_user: string; room: string }
) => {
  const { from_user, room } = data;
  try {
    console.log(`${from_user} joined room ${room}`);
    socket.join(room);

    const messages = await getRoomMessages(room);
    socket.emit("history_messages", messages);
  } catch (error) {
    console.error(`Error in handleJoinRoom: ${error}`);
    socket.emit("error", { message: "Failed to join room" });
  }
};

export const handleSendMessage = async (io: Server, data: MessageProps) => {
  const { content, from_user_id, chatId } = data;
  try {
    io.in(chatId).emit("receive_message", {
      content,
      senderId: from_user_id,
      createdAt: new Date().toISOString(),
    });
    io.emit("refresh_conversation", {
      chatId,
      content,
      date: new Date().toISOString(),
    });
    await createMessage(from_user_id, content, chatId);
    await RefreshConversation(chatId);
  } catch (error) {
    console.error(`Error in handleSendMessage: ${error}`);
    io.in(chatId).emit("error", { message: "Failed to send message" });
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

export const handleCreateChat = async (
  socket: Socket,
  data: { usersId: string[] }
) => {
  try {
    const chat = await createChat(data);
    socket.emit("chat_created", chat);
  } catch (error) {
    console.error(`Error in handleCreateChat: ${error}`);
    socket.emit("error", { message: "Failed to create chat" });
  }
};
