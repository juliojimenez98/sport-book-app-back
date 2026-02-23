import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Use SES credentials for S3 since they belong to the same IAM user
const s3Client = new S3Client({
  region: process.env.AMAZON_SES_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AMAZON_SES_ACCESS_KEY || "",
    secretAccessKey: process.env.AMAZON_SES_SECRET_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "bucket-easysportbook";

export const s3Service = {
  /**
   * Uploads an image buffer to S3 and returns its generated object key.
   */
  uploadImage: async (
    buffer: Buffer,
    mimetype: string,
    folder: string = "uploads",
  ): Promise<string> => {
    // Determine extension based on mimetype
    let ext = "jpg";
    if (mimetype === "image/png") ext = "png";
    else if (mimetype === "image/webp") ext = "webp";
    else if (mimetype === "image/svg+xml") ext = "svg";

    const fileName = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimetype,
    });

    await s3Client.send(command);
    return fileName;
  },

  /**
   * Generates a Presigned URL proxy for reading objects dynamically from a private bucket
   * The returned URL will be valid for 1 hour
   */
  getPresignedUrl: async (key: string): Promise<string> => {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    // 3600 seconds = 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  },
};
