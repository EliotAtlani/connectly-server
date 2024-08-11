import { Socket, Server } from "socket.io";
import { MessageProps } from "../types";
import {
  addMemberToChat,
  createChat,
  createMessage,
  createReaction,
  deleteReaction,
  getActivityUser,
  getOtherUser,
  getRoomMessages,
  markMessageAsRead,
  RefreshConversation,
  updateGroupImage,
  updateGroupName,
} from "../services/messageService";
import { uploadToS3 } from "../services/imgageUploadService";
import { ReactionType, User } from "@prisma/client";

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
  const { content, from_user_id, chatId, replyMessageId, replyTo } = data;

  try {
    const socketsInRoom = io.sockets.adapter.rooms.get(chatId) || new Set();
    const isOtherInRoom = socketsInRoom.size > 1;
    const message = await createMessage(
      from_user_id,
      content,
      chatId,
      replyMessageId
    );

    io.in(chatId).emit("receive_message", {
      id: message.id,
      content,
      senderId: from_user_id,
      sender: message.sender,
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
      content: message,
      date: new Date().toISOString(),
      from_user_id,
      sender: message.sender,
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
      username: data.username,
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
  io: Server,
  data: { usersId: string[]; creator: User; groupName?: string }
) => {
  try {
    const chat = await createChat(data);

    //First message
    const message = await createMessage(
      data.creator.userId,
      `${data.creator.username} created the ${
        data.usersId.length > 2 ? "group" : "chat"
      }`,
      chat.id,
      undefined,
      "SYSTEM"
    );
    socket.emit("chat_created", chat);
    io.emit("add_conversation", {
      chatId: chat.id,
      content: message,
      date: new Date().toISOString(),
      from_user_id: message.senderId,
      sender: message.sender,
      is_other_in_room: true,
      type: chat.type,
      name: data.groupName,
    });
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
  const { from_user_id, chatId, file, replyMessageId } = data;

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
      sender: message.sender,
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

    console.log("refreshing conversation", message.sender);

    io.emit("refresh_conversation", {
      chatId,
      content: message,
      date: new Date().toISOString(),
      from_user_id,
      sender: message.sender,
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

export const handleChangeGroupName = async (
  io: Server,
  socket: Socket,
  data: { chatId: string; name: string; user: User }
) => {
  try {
    const { chatId, name, user } = data;

    await updateGroupName(chatId, name);

    const message = await createMessage(
      user.userId,
      `${user.username} changed groupname to ${name}`,
      chatId,
      undefined,
      "SYSTEM"
    );

    io.in(chatId).emit("receive_message", {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      sender: message.sender,
      createdAt: new Date().toISOString(),
      type: message.type,
      chatId: chatId,
    });

    io.emit("refresh_conversation", {
      chatId,
      content: message,
      date: new Date().toISOString(),
      from_user_id: user.userId,
      sender: message.sender,
      is_other_in_room: true,
      type: message.type,
      name,
    });

    socket.emit("refresh_header", {
      chatId,
      name,
    });
  } catch (error) {
    console.error(`Error in handleChangeGroupName: ${error}`);
    io.emit("error", { message: "Failed to change group name" });
  }
};

export const handleChangeGroupImage = async (
  io: Server,
  socket: Socket,
  data: { chatId: string; image: Buffer; user: User }
) => {
  try {
    const { chatId, image, user } = data;

    // Generate a unique file name
    const fileName = `group-cover/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.jpg`;

    const url = await uploadToS3(image, fileName);

    await updateGroupImage(chatId, url);

    const message = await createMessage(
      user.userId,
      `${user.username} changed group image`,
      chatId,
      undefined,
      "SYSTEM"
    );

    io.in(chatId).emit("receive_message", {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      sender: message.sender,
      createdAt: new Date().toISOString(),
      type: message.type,
      chatId: chatId,
    });

    io.emit("refresh_conversation", {
      chatId,
      content: message,
      date: new Date().toISOString(),
      from_user_id: user.userId,
      avatar: url,
      sender: message.sender,
      is_other_in_room: true,
      type: message.type,
    });
    socket.emit("refresh_header", {
      chatId,
      image: url,
    });
  } catch (error) {
    console.error(`Error in changeGroupImage: ${error}`);
    io.emit("error", { message: "Failed to change group image" });
  }
};

export const handleAddMember = async (
  io: Server,
  socket: Socket,
  data: { chatId: string; user: User; userAdded: User }
) => {
  try {
    const { chatId, userAdded, user } = data;

    await addMemberToChat(chatId, userAdded.userId);

    const message = await createMessage(
      user.userId,
      `${user.username} added ${userAdded.username} the group`,
      chatId,
      undefined,
      "SYSTEM"
    );

    io.in(chatId).emit("receive_message", {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      sender: message.sender,
      createdAt: new Date().toISOString(),
      type: message.type,
      chatId: chatId,
    });

    io.emit("refresh_conversation", {
      chatId,
      content: message,
      date: new Date().toISOString(),
      from_user_id: user.userId,
      sender: message.sender,
      is_other_in_room: true,
      type: message.type,
    });
  } catch (error) {
    console.error(`Error in handleAddMember: ${error}`);
    io.emit("error", { message: "Failed to add member" });
  }
};
