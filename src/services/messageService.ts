import { prisma } from "../config/database";

export const joinRoom = async (from_user: string, room: string) => {
  let existingRoom = await prisma.room.findFirst({
    where: { name: room },
  });
  if (!existingRoom) {
    existingRoom = await prisma.room.create({
      data: { name: room, type: "PUBLIC" },
    });
  }

  let existingUserChannel = await prisma.userChannel.findFirst({
    where: { user_id: from_user, room: room },
  });
  if (!existingUserChannel) {
    existingUserChannel = await prisma.userChannel.create({
      data: { user_id: from_user, room: room },
    });

    await createMessage(
      "System",
      room,
      `${from_user} has joined the chat room`
    );
  }
};

export const getRoomMessages = async (room: string) => {
  const messages = await prisma.message.findMany({
    where: { room },
  });
  return messages.map((msg) => ({
    ...msg,
    id: msg.id.toString(),
  }));
};

export const createMessage = async (
  from_user: string,
  room: string,
  content: string
) => {
  return await prisma.message.create({
    data: { from_user, room, content },
  });
};
