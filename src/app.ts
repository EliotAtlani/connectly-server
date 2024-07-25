import express from "express";
import http from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { MessageProps } from "./types";
import { auth } from "express-oauth2-jwt-bearer";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import cors from "cors";
const checkJwt = auth({
  audience: "http://localhost:3000/",
  issuerBaseURL: `https://dev-j8sjd88bmveue6wh.us.auth0.com/`,
});

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
// Create a JWKS client
const client = jwksClient({
  jwksUri: `https://dev-j8sjd88bmveue6wh.us.auth0.com/.well-known/jwks.json`, // Replace with your Auth0 domain
});

// Function to get the signing key
const getKey = (
  header: jwt.JwtHeader,
  callback: (error: Error | null, key?: string) => void
) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
};

// Middleware to check JWT for socket connections
io.use(async (socket, next) => {
  try {
    // Extract token from query params
    const token = socket.handshake.query.token as string;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    // Verify token with Auth0 public key
    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        console.error(err);
        next(new Error("Authentication error"));
      } else {
        // Optionally store user information on socket object
        // socket.user = decoded;
        next();
      }
    });
  } catch (err) {
    console.error(err);
    next(new Error("Authentication error"));
  }
});

app.get("/api/public", function (req, res) {
  res.json({
    message:
      "Hello from a public endpoint! You don't need to be authenticated to see this.",
  });
});

// This route needs authentication
app.get("/api/private", checkJwt, function (req, res) {
  res.json({
    message:
      "Hello from a private endpoint! You need to be authenticated to see this.",
  });
});

const PORT = process.env.PORT || 3000;

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join_room", async (data) => {
    const { from_user, room } = data;
    console.log(`${from_user} joined room ${room}`);

    // Check if room already exists
    let existingRoom = await prisma.room.findFirst({
      where: {
        name: room,
      },
    });
    if (!existingRoom) {
      existingRoom = await prisma.room.create({
        data: {
          name: room,
          type: "PUBLIC",
        },
      });
    }

    // Add user to channel if not already in the room
    let existingUserChannel = await prisma.userChannel.findFirst({
      where: {
        username: from_user,
        room: room,
      },
    });
    console.log(existingUserChannel, from_user, room);
    if (!existingUserChannel) {
      existingUserChannel = await prisma.userChannel.create({
        data: {
          username: from_user,
          room: room,
        },
      });

      // Only emit the join message if this is a new user-channel connection
      let __createdtime__ = Date.now();
      socket.to(room).emit("receive_message", {
        content: `${from_user} has joined the chat room`,
        from_user: "System",
        __createdtime__,
      });
      await prisma.message.create({
        data: {
          from_user: "System",
          room,
          content: `${from_user} has joined the chat room`,
        },
      });
    }

    socket.join(room);

    // Get all messages
    const messages = await prisma.message.findMany({
      where: {
        room,
      },
    });
    // Convert BigInt to string
    const sanitizedMessages = messages.map((msg) => ({
      ...msg,
      id: msg.id.toString(),
    }));
    console.log("send message");

    socket.emit("history_messages", sanitizedMessages);
  });

  socket.on("refresh", async (data) => {
    const { from_user, room } = data;
    console.log("Refreshing", from_user, room);

    // Get all messages
    const messages = await prisma.message.findMany({
      where: {
        room,
      },
    });
    // Convert BigInt to string
    const sanitizedMessages = messages.map((msg) => ({
      ...msg,
      id: msg.id.toString(),
    }));
    console.log("send message");

    socket.emit("history_messages", sanitizedMessages);
  });

  socket.on("send_message", async (data: MessageProps) => {
    const { content, from_user, room } = data;
    io.in(room).emit("receive_message", data); // Send to all users in room, including sender
    await prisma.message.create({
      data: {
        from_user,
        room,
        content,
      },
    });
  });

  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("user_typing", { username });
  });

  socket.on("stop_typing", ({ room, username }) => {
    socket.to(room).emit("user_stop_typing", { username });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
