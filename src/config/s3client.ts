import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

//Check if the environment variables are set
if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION is not set");
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID is not set");
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY is not set");
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default s3Client;
