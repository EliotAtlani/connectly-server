import { Socket, Server } from "socket.io";
import { MessageProps } from "../types";
import {
  createChat,
  createMessage,
  getActivityUser,
  getOtherUser,
  getRoomMessages,
  markMessageAsRead,
  RefreshConversation,
} from "../services/messageService";

export const handleJoinRoom = async (
  socket: Socket,
  io: Server,
  data: { from_user: string; room: string }
) => {
  const { from_user, room } = data;
  try {
    const currentRooms = Array.from(socket.rooms);
    currentRooms.forEach((currentRoom) => {
      if (currentRoom !== socket.id) {
        socket.leave(currentRoom);
        console.log(`${from_user} left room ${currentRoom}`);
      }
    });
    console.log(`${from_user} joined room ${room}`);
    socket.join(room);

    const messages = await getRoomMessages(room);
    socket.emit("history_messages", messages);
    const activityUser = await getActivityUser(room, from_user);
    socket.emit("activity_user", activityUser);

    // Find the last message sent by the other user and mark it as read
    if (messages.length > 0) {
      const lastMessageFromOtherUser = messages
        .slice()
        .reverse()
        .find((message) => message.senderId !== from_user);

      if (lastMessageFromOtherUser) {
        io.in(room).emit("mark_as_read", {
          message_id: lastMessageFromOtherUser.id,
          userId: lastMessageFromOtherUser.senderId,
        });
        await markMessageAsRead(from_user, lastMessageFromOtherUser.id);
      }
    }
  } catch (error) {
    console.error(`Error in handleJoinRoom: ${error}`);
    socket.emit("error", { message: "Failed to join room" });
  }
};

export const handleSendMessage = async (io: Server, data: MessageProps) => {
  const { content, from_user_id, chatId } = data;
  try {
    const socketsInRoom = io.sockets.adapter.rooms.get(chatId) || new Set();
    console.log(`socketsInRoom: ${JSON.stringify(socketsInRoom)}`);
    const isOtherInRoom = socketsInRoom.size > 1;
    const message = await createMessage(from_user_id, content, chatId);

    io.in(chatId).emit("receive_message", {
      id: message.id,
      content,
      senderId: from_user_id,
      createdAt: new Date().toISOString(),
      chatId: chatId,
    });

    if (isOtherInRoom) {
      const otherUserId = await getOtherUser(chatId, from_user_id);
      if (otherUserId) {
        io.in(chatId).emit("mark_as_read", {
          message_id: message.id,
          userId: from_user_id,
        });
        await markMessageAsRead(otherUserId, message.id);
      }
    }

    io.emit("refresh_conversation", {
      chatId,
      content,
      date: new Date().toISOString(),
      from_user_id,
      is_other_in_room: isOtherInRoom,
    });
    await RefreshConversation(chatId);
  } catch (error) {
    console.error(`Error in handleSendMessage: ${error}`);
    io.in(chatId).emit("error", { message: "Failed to send message" });
  }
};

export const handleTyping = (
  io: Server,
  socket: Socket,
  data: { chatId: string; username: string; userId: string }
) => {
  try {
    socket.to(data.chatId).emit("user_typing", { username: data.username });

    io.emit("user_typing_conv", {
      chatId: data.chatId,
      username: data.username,
      userId: data.userId,
    });
  } catch (error) {
    console.error(`Error in handleTyping: ${error}`);
    io.emit("error", { message: "Failed to broadcast typing status" });
  }
};

export const handleStopTyping = (
  io: Server,
  socket: Socket,
  data: { chatId: string; username: string; userId: string }
) => {
  try {
    io.to(data.chatId).emit("user_stop_typing", { username: data.username });

    io.emit("user_stop_typing_conv", {
      chatId: data.chatId,
      userId: data.userId,
    });
  } catch (error) {
    console.error(`Error in handleStopTyping: ${error}`);
    io.emit("error", { message: "Failed to broadcast stop typing status" });
  }
};

export const handleRefresh = async (
  socket: Socket,
  data: { from_user: string; room: string }
) => {
  const { from_user, room } = data;
  try {
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
