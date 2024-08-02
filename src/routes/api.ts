import express from "express";
import { prisma } from "../config/database";
import { validateDto } from "../middlewares/validateDto";
import {
  AcceptFriendDto,
  AddFriendDto,
  CreateUserDto,
  OnBoardUserDto,
} from "../dto/user.dto";
import { setupAuth } from "../config/auth";
import { UserController } from "../controllers/userController";

const router = express.Router();
const checkJwt = setupAuth(express());

router.get("/public", (req, res) => {
  res.json({
    message:
      "Hello from a public endpoint! You don't need to be authenticated to see this.",
  });
});

router.get("/private", (req, res) => {
  res.json({
    message:
      "Hello from a private endpoint! You need to be authenticated to see this.",
  });
});

///////////
///USERS///
///////////

router.post(
  "/users/create-user",
  validateDto(CreateUserDto),
  UserController.createUser
);

router.post(
  "/users/onboard-user",
  checkJwt,
  validateDto(OnBoardUserDto),
  UserController.onboardUser
);

router.post(
  "/users/add-friend",
  checkJwt,
  validateDto(AddFriendDto),
  UserController.addFriend
);

router.post(
  "/users/accept-friend",
  checkJwt,
  validateDto(AcceptFriendDto),
  UserController.acceptFriendRequest
);

router.get(
  "/users/friends-request/:userId",
  checkJwt,
  UserController.getFriendsRequest
);

router.get(
  "/users/friends-list/:userId",
  checkJwt,
  UserController.getFriendsList
);

router.get(
  "/users/friends-request-number/:userId",
  UserController.getFriendsRequestNumber
);

///////////
// CHATS //
///////////

router.get("/chat/:chatId/:userId", checkJwt, UserController.getChat);

router.get(
  "/chat-conversations/:userId",
  checkJwt,
  UserController.getConversations
);
export default router;
