import express from "express";
import { prisma } from "../config/database";
import { validateDto } from "../middlewares/validateDto";
import {
  AcceptFriendDto,
  AddFriendDto,
  CreateUserDto,
  OnBoardUserDto,
  PatchChatSettings,
  PatchUserSettings,
  PostDownloadImage,
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

router.patch(
  "/users/:userId",
  validateDto(PatchUserSettings),
  checkJwt,
  UserController.UpdateUserSettings
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

router.post(
  "/users/refuse-friend",
  checkJwt,
  validateDto(AcceptFriendDto),
  UserController.refuseFriendRequest
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

router.get("/users/friend-info/:userId", UserController.getFriendInfo);

///////////
// CHATS //
///////////

router.get("/chat/:chatId/:userId", checkJwt, UserController.getChat);

router.get(
  "/chat-conversations/:userId",
  checkJwt,
  UserController.getConversations
);

router.get(
  "/chat-messages/:chatId/messages",
  checkJwt,
  UserController.getMessages
);

/////////////////
//SETTINGS CHAT//
/////////////////

router.patch(
  "/chat-settings/:chatId",
  checkJwt,
  validateDto(PatchChatSettings),
  UserController.updateChatSettings
);

///////////////////
//DOWNLOAD FILES///
///////////////////

router.post(
  "/upload-image/download",
  validateDto(PostDownloadImage),
  UserController.downloadImage
);
export default router;
