import { Request, Response, NextFunction } from "express";
import { s3Service } from "../lib/s3Service";
import { badRequest } from "../middlewares/errorHandler";

export const uploadImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      throw badRequest("No image provided. Please upload a file.");
    }

    // Determine target folder from query (e.g., ?folder=tenants)
    const folder = (req.query.folder as string) || "general";

    // Upload to S3 directly from memory buffer
    const key = await s3Service.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      folder,
    );

    res.status(201).json({
      success: true,
      data: {
        key,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to safely get proxy images from Private S3 via Http 302 Redirection
 */
export const getAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { key } = req.query;

    if (!key || typeof key !== "string") {
      throw badRequest("Asset key is required");
    }

    // Generate Presigned URL
    const url = await s3Service.getPresignedUrl(key);

    // Redirect the visual UI to the Presigned AWS Bucket image for up to 1 Hour
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};
