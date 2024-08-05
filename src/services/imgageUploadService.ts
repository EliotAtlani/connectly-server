import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import s3Client from "../config/s3client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const uploadToS3 = async (
  file: Buffer,
  fileName: string
): Promise<string> => {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileName,
      Body: file,
      ContentType: "image/jpeg",
    },
  });

  try {
    const result: PutObjectCommandOutput = await upload.done();
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const getSignedUrlImage = async (fileName: string) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: fileName,
    });

    return getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expiration time in seconds
    });
  } catch (error) {
    console.error("Error getting signed url:", error);
  }
};
