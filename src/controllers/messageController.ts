import { Socket, Server } from "socket.io";
import { MessageProps } from "../types";
import {
  createChat,
  createMessage,
  createReaction,
  deleteReaction,
  getActivityUser,
  getOtherUser,
  getRoomMessages,
  markMessageAsRead,
  RefreshConversation,
} from "../services/messageService";
import { uploadToS3 } from "../services/imgageUploadService";
import { ReactionType } from "@prisma/client";

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
    if (messages.messages.length > 0) {
      const lastMessageFromOtherUser = messages.messages
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
  const {
    content,
    from_user_id,
    from_username,
    chatId,
    replyMessageId,
    replyTo,
  } = data;

  try {
    const socketsInRoom = io.sockets.adapter.rooms.get(chatId) || new Set();
    const isOtherInRoom = socketsInRoom.size > 1;
    const message = await createMessage(
      from_user_id,
      from_username,
      content,
      chatId,
      replyMessageId
    );

    io.in(chatId).emit("receive_message", {
      id: message.id,
      content,
      senderId: from_user_id,
      senderName: from_username,
      replyToId: replyMessageId,
      replyTo: replyTo,
      createdAt: new Date().toISOString(),
      type: message.type,
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
      from_username,
      is_other_in_room: isOtherInRoom,
      type: message.type,
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

export const handleUploadImage = async (
  io: Server,
  socket: Socket,
  data: MessageProps
) => {
  const { from_user_id, chatId, file, replyMessageId, from_username } = data;

  if (!file) {
    io.emit("error", { message: "No file found" });
    return;
  }

  try {
    const socketsInRoom = io.sockets.adapter.rooms.get(chatId) || new Set();
    const isOtherInRoom = socketsInRoom.size > 1;
    // Generate a unique file name
    const fileName = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.jpg`;

    const url = await uploadToS3(file, fileName);

    const message = await createMessage(
      from_user_id,
      from_username,
      url,
      chatId,
      replyMessageId,
      "IMAGE"
    );

    socket.broadcast.to(chatId).emit("receive_message", {
      id: message.id,
      content: url,
      type: message.type,
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
      content: "Send an image",
      date: new Date().toISOString(),
      from_user_id,
      is_other_in_room: isOtherInRoom,
    });
    await RefreshConversation(chatId);
  } catch (error) {
    console.error(`Error in handleUploadImage: ${error}`);
    io.in(chatId).emit("error", { message: "Failed to send message" });
  }
};

export const handleReactMessage = async (
  io: Server,
  data: { userId: string; messageId: string; type: ReactionType }
) => {
  try {
    const { messageId, type, userId } = data;
    const reaction = await createReaction(userId, messageId, type);
    io.emit("receive_reaction", reaction);
  } catch (error) {
    console.error(`Error in handleReactMessage: ${error}`);
    io.emit("error", { message: "Failed to react message" });
  }
};

export const handleRemoveReaction = async (
  io: Server,
  data: { userId: string; messageId: string }
) => {
  try {
    const { userId, messageId } = data;
    await deleteReaction(userId, messageId);

    io.emit("delete_reaction", {
      messageId,
      userId,
      type: null,
    });
  } catch (error) {
    console.error(`Error in handleRemoveReaction: ${error}`);
    io.emit("error", { message: "Failed to remove reaction" });
  }
};
