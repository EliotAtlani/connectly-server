import { prisma } from "../config/database";

export const joinRoom = async (from_user: string, room: string) => {
  // let existingRoom = await prisma.room.findFirst({
  //   where: { name: room },
  // });
  // console.log(existingRoom);
  // if (!existingRoom) {
  //   existingRoom = await prisma.room.create({
  //     data: { name: room, type: "PUBLIC" },
  //   });
  // }
  // let existingUserChannel = await prisma.userChannel.findFirst({
  //   where: { user_id: from_user, room: room },
  // });
  // if (!existingUserChannel) {
  //   existingUserChannel = await prisma.userChannel.create({
  //     data: { user_id: from_user, room: room },
  //   });
  // await createMessage(
  //   "System",
  //   room,
  //   `${from_user} has joined the chat room`
  // );
  // }
};

export const getRoomMessages = async (room: string) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: room },
  });
  return messages.map((msg) => ({
    ...msg,
    id: msg.id.toString(),
  }));
};

export const createMessage = async (
  from_user_id: string,
  content: string,
  chatId: string
) => {
  return await prisma.message.create({
    data: {
      conversationId: chatId,
      senderId: from_user_id,
      content: content,
    },
  });
};

export const RefreshConversation = async (room: string) => {
  await prisma.conversation.update({
    where: { id: room },
    data: { updatedAt: new Date() },
  });
};
export const createChat = async (data: { usersId: string[] }) => {
  if (data.usersId.length < 2) {
    throw new Error("Invalid number of users");
  }

  if (data.usersId.length > 2) {
    throw new Error("Group chat not supported yet");
  }
  // Check if chat already exists
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { type: "PRIVATE" },
        {
          participants: {
            every: {
              userId: { in: data.usersId },
            },
          },
        },
        { participants: { some: { userId: data.usersId[0] } } },
        { participants: { some: { userId: data.usersId[1] } } },
      ],
    },
    include: {
      participants: true,
    },
  });

  if (existingConversation) {
    return existingConversation;
  }
  const conversation = await prisma.conversation.create({
    data: {
      type: "PRIVATE",
    },
  });

  await Promise.all(
    data.usersId.map(async (userId) => {
      await prisma.conversationUser.create({
        data: {
          conversationId: conversation.id,
          userId,
        },
      });
    })
  );

  return conversation;
};
