import { Request, Response } from "express";
import { PrismaClient, User, FriendRequest } from "@prisma/client";
import { getUnreadMessageCount } from "../services/messageService";

const prisma = new PrismaClient();

export class UserController {
  static async getPublicMessage(req: Request, res: Response): Promise<void> {
    res.json({
      message:
        "Hello from a public endpoint! You don't need to be authenticated to see this.",
    });
  }

  static async getPrivateMessage(req: Request, res: Response): Promise<void> {
    res.json({
      message:
        "Hello from a private endpoint! You need to be authenticated to see this.",
    });
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { id, username }: { id: string; username: string } = req.body;

      const user: User = await prisma.user.upsert({
        where: { userId: id },
        update: {},
        create: {
          userId: id,
          username,
        },
      });

      res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  }

  static async onboardUser(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        image,
        userId,
      }: { username: string; image: number; userId: string } = req.body;

      const user: User = await prisma.user.update({
        where: { userId },
        data: {
          username,
          avatar: image,
          isOnBoarded: true,
        },
      });

      res.status(200).json({ message: "User onboarded successfully", user });
    } catch (error) {
      console.error("Error onboarding user:", error);
      res.status(500).json({ message: "Error onboarding user" });
    }
  }

  static async addFriend(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        friendUsername,
      }: { userId: string; friendUsername: string } = req.body;

      // Find the user by username
      const user: User | null = await prisma.user.findUnique({
        where: { username: friendUsername },
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Add friend request
      const friendRequest: FriendRequest = await prisma.friendRequest.create({
        data: {
          senderId: userId,
          receiverId: user.userId,
          status: "PENDING",
        },
      });

      res.status(200).json({ message: "Friend request sent successfully" });
    } catch (error) {
      console.error("Error adding friend:", error);
      res.status(500).json({ message: "Error adding friend" });
    }
  }

  static async acceptFriendRequest(req: Request, res: Response): Promise<void> {
    try {
      const { userId, senderId }: { userId: string; senderId: string } =
        req.body;

      // Find the friend request
      const friendRequest: FriendRequest | null =
        await prisma.friendRequest.findFirst({
          where: {
            senderId,
            receiverId: userId,
            status: "PENDING",
          },
        });

      if (!friendRequest) {
        res.status(404).json({ message: "Friend request not found" });
        return;
      }

      // Accept the friend request
      await prisma.friendRequest.update({
        where: { id: friendRequest.id },
        data: { status: "ACCEPTED" },
      });

      // Add the friend
      await prisma.friendship.create({
        data: {
          user1Id: userId,
          user2Id: senderId,
        },
      });

      res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Error accepting friend request" });
    }
  }

  static async getFriendsRequest(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const friendRequests: FriendRequest[] =
        await prisma.friendRequest.findMany({
          where: {
            receiverId: userId,
            status: "PENDING",
          },
          include: {
            sender: {
              select: {
                username: true,
                avatar: true,
              },
            },
          },
        });

      res.status(200).json(friendRequests);
    } catch (error) {
      console.error("Error getting friends:", error);
      res.status(500).json({ message: "Error getting friends" });
    }
  }

  static async getFriendsRequestNumber(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;

      const friendsRequestNumber = await prisma.friendRequest.count({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
      });

      res.status(200).json(friendsRequestNumber);
    } catch (error) {
      console.error("Error getting friends request number:", error);
      res.status(500).json({ message: "Error getting friends request number" });
    }
  }

  static async getFriendsList(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const friends = await prisma.friendship.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          user1: {
            select: {
              username: true,
              avatar: true,
            },
          },
          user2: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
      });

      //Remove the userId from the friend object
      const friendsList = friends.map((friend) => {
        if (friend.user1Id === userId) {
          return {
            userId: friend.user2Id,
            username: friend.user2.username,
            avatar: friend.user2.avatar,
            createdAt: friend.createdAt,
          };
        } else {
          return {
            userId: friend.user1Id,
            username: friend.user1.username,
            avatar: friend.user1.avatar,
            createdAt: friend.createdAt,
          };
        }
      });

      res.status(200).json(friendsList);
    } catch (error) {
      console.error("Error getting friends:", error);
      res.status(500).json({ message: "Error getting friends" });
    }
  }

  static async getChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, userId } = req.params;

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
        res.status(404).json({ message: "Conversation not found" });
        return;
      }

      //Find the user which is not userId
      const user = conversation.participants.find(
        (participant) => participant.userId !== userId
      );

      const data = {
        name: user?.user.username,
        avatar: user?.user.avatar,
      };

      res.status(200).json({
        data,
        id: conversation.id,
        lastMessageReadId: user?.lastReadMessageId,
      });
    } catch (error) {
      console.error("Error getting chat:", error);
      res.status(500).json({ message: "Error getting chat" });
    }
  }

  static async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId,
            },
          },
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
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      //Find the user which is not userId
      const finalArray = [];

      for (const conversation of conversations) {
        const user = conversation.participants.find(
          (participant) => participant.userId !== userId
        );

        const messageUnReadCount = await getUnreadMessageCount(
          userId,
          conversation.id
        );

        const data = {
          chatId: conversation.id,
          name: user?.user.username,
          avatar: user?.user.avatar,
          lastMessage: conversation.messages[0]?.content,
          lastMessageDate: conversation.messages[0]?.createdAt,
          unreadMessageCount: messageUnReadCount,
        };

        finalArray.push(data);
      }

      res.status(200).json(finalArray);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ message: "Error getting conversations" });
    }
  }
}
