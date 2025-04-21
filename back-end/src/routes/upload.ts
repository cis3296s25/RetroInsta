import express, { Request, Response, Router } from 'express';
import multer, { Multer } from 'multer';
import { IS_PRODUCTION, s3Client, BUCKET, STORAGE_PUBLIC_HOST } from '../config/config.js'; // Import S3 config
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router: Router = express.Router();

// Configure Multer for memory storage
export const upload: Multer = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB
});

/**
 * Uploads an image file (from multer) to S3/Minio using AWS SDK v3.
 * @param imgFile - The file object provided by multer (req.file)
 * @returns The public URL of the uploaded object.
 */
export async function storeImage(imgFile: Express.Multer.File): Promise<string> {
    if (!imgFile) {
        throw new Error("No image file provided to storeImage function.");
    }
    if (!BUCKET) {
        throw new Error("BUCKET environment variable is not set.");
    }

    try {
        const originalFilename = imgFile.originalname;
        // Sanitize filename (optional but recommended)
        const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueId = uuidv4();
        // Use path.extname to reliably get the extension
        const extension = path.extname(sanitizedFilename);
        const baseName = path.basename(sanitizedFilename, extension);
        const objectKey = `${uniqueId}-${baseName}${extension}`; // S3 Object Key

        const fileBuffer = imgFile.buffer;
        const fileType = imgFile.mimetype;

        console.log(`[Upload] Uploading '${objectKey}' to bucket '${BUCKET}' with type '${fileType}'`);

        const putCommand = new PutObjectCommand({
            Bucket: BUCKET,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: fileType,
        });

        const uploadResult = await s3Client.send(putCommand);
        console.log("[Upload] S3 SDK upload result:", uploadResult); // Log result for debugging

        let viewUrl: string;

        if (IS_PRODUCTION) {
            // Production uses S3 virtual-hosted style URL
            viewUrl = `${STORAGE_PUBLIC_HOST}/${objectKey}`;
            console.log(`[Upload] Production URL constructed: ${viewUrl}`);
        } else {
            // Development uses MinIO path-style URL for localhost access
            viewUrl = `${STORAGE_PUBLIC_HOST}/${BUCKET}/${objectKey}`;
            console.log(`[Upload] Development (MinIO) URL constructed: ${viewUrl}`);
        }

        console.log(`[Upload] File uploaded successfully. URL: ${viewUrl}`);
        return viewUrl;

    } catch (error) {
        console.error(`[Upload] Error uploading file '${imgFile.originalname}' to S3 compatible storage:`, error);
        // Log specific AWS SDK errors if possible
        if (error instanceof Error) {
             console.error(`[Upload] Error Name: ${error.name}`);
             console.error(`[Upload] Error Message: ${error.message}`);
        }
        throw error; // Re-throw the error for the calling route handler
    }
}

export default router;