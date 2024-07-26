import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { getKey } from "../config/auth";

export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.query.token as string;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        console.error(err);
        next(new Error("Authentication error"));
      } else {
        next();
      }
    });
  } catch (err) {
    console.error(err);
    next(new Error("Authentication error"));
  }
};
