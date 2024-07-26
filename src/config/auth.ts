import { Express } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";

export const setupAuth = (app: Express) => {
  const checkJwt = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER,
  });

  app.use("/api/private", checkJwt);

  return checkJwt;
};

export const client = jwksClient({
  jwksUri: process.env.AUTH0_DOMAIN ?? "",
});

export const getKey = (
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
