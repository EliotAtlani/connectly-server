import express from "express";
import { prisma } from "../config/database";
import { validateDto } from "../middlewares/validateDto";
import { CreateUserDto } from "../dto/user.dto";

const router = express.Router();

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

router.post("/create-user", validateDto(CreateUserDto), async (req, res) => {
  try {
    const { id, username } = req.body;

    const user = await prisma.user.create({
      data: {
        id,
        username,
      },
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});
export default router;
