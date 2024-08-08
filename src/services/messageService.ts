import { ReactionType } from "@prisma/client";
import { prisma } from "../config/database";

export const getRoomMessages = async (
  room: string,
  page = 1,
  pageSize = 100
) => {
  // Calculate the offset
  const skip = (page - 1) * pageSize;

  // Fetch paginated messages
  const messages = await prisma.message.findMany({
    where: { conversationId: room },
    include: {
      replyTo: true,
      reactions: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: pageSize,
    skip: skip,
  });
  // Reverse the messages to maintain chronological order
  messages.reverse();

  // Fetch the total count of messages
  const totalMessages = await prisma.message.count({
    where: { conversationId: room },
  });

  return {
    messages,
    totalMessages,
    currentPage: page,
    totalPages: Math.ceil(totalMessages / pageSize),
  };
};
export const createMessage = async (
  from_user_id: string,
  from_user_name: string,
  content: string,
  chatId: string,
  replyMessageId?: string,
  type: "TEXT" | "IMAGE" = "TEXT"
) => {
  if (replyMessageId) {
    const replyMessage = await prisma.message.findUnique({
      where: { id: replyMessageId },
    });

    if (!replyMessage) {
      throw new Error("Reply message not found");
    }

    return await prisma.message.create({
      data: {
        conversationId: chatId,
        senderId: from_user_id,
        senderName: from_user_name,
        content: content,
        type: type,
        replyToId: replyMessageId,
      },
    });
  }
  return await prisma.message.create({
    data: {
      conversationId: chatId,
      senderId: from_user_id,
      senderName: from_user_name,
      content: content,
      type: type,
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

export async function markMessageAsRead(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  await prisma.conversationUser.update({
    where: {
      userId_conversationId: {
        userId: userId,
        conversationId: message.conversationId,
      },
    },
    data: {
      lastReadMessageId: messageId,
    },
  });
}

export async function getUnreadMessageCount(
  userId: string,
  conversationId: string
) {
  const conversationUser = await prisma.conversationUser.findUnique({
    where: {
      userId_conversationId: {
        userId: userId,
        conversationId: conversationId,
      },
    },
    include: {
      lastReadMessage: true,
    },
  });

  if (!conversationUser) {
    throw new Error("User is not part of this conversation");
  }

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: conversationId,
      createdAt: {
        gt:
          conversationUser.lastReadMessage?.createdAt ??
          conversationUser.joinedAt,
      },
      NOT: {
        senderId: userId,
      },
    },
  });

  return unreadCount;
}

export async function updateIsOnline(userId: string, isOnline: boolean) {
  try {
    await prisma.user.update({
      where: { userId: userId },
      data: { is_online: isOnline },
    });
  } catch (error) {
    console.error(`Error updating is online for user ${userId}:`, error);
  }
}
export async function updateUserLastPing(userId: string) {
  try {
    await prisma.user.update({
      where: { userId: userId },
      data: { last_ping: new Date() },
    });
  } catch (error) {
    console.error(`Error updating last ping for user ${userId}:`, error);
  }
}

export const getActivityUser = async (room: string, from_user: string) => {
  try {
    const otherParticipant = await prisma.conversationUser.findFirst({
      where: {
        conversationId: room,
        userId: {
          not: from_user,
        },
      },
      select: {
        user: {
          select: {
            last_ping: true,
            is_online: true,
          },
        },
      },
    });

    return {
      isOnline: otherParticipant?.user.is_online,
      lastPing: otherParticipant?.user.last_ping,
    };
  } catch (error) {
    console.error(`Error in getLastPingUser: ${error}`);
  }
};

export const getOtherUser = async (chatId: string, from_user: string) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: chatId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const otherUser = conversation.participants.find(
      (participant) => participant.userId !== from_user
    );

    return otherUser?.userId;
  } catch (error) {
    console.error(`Error in getOtherUser: ${error}`);
  }
};

export const createReaction = async (
  userId: string,
  messageId: string,
  type: ReactionType
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      reactions: true,
    },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  const userReaction = message.reactions.find((r) => r.userId === userId);

  if (userReaction) {
    await prisma.reaction.delete({
      where: { id: userReaction.id },
    });
  }

  return await prisma.reaction.create({
    data: {
      userId,
      messageId,
      type,
    },
    include: {
      user: true,
    },
  });
};

export const deleteReaction = async (userId: string, messageId: string) => {
  const reaction = await prisma.reaction.findFirst({
    where: {
      userId,
      messageId,
    },
  });

  if (!reaction) {
    throw new Error("Reaction not found");
  }

  await prisma.reaction.delete({
    where: {
      id: reaction.id,
    },
  });
};
