import express, { Request, Response, Router } from 'express';
import multer, { Multer } from 'multer';
import axios from 'axios'; // Ensure axios is imported
import { minioClient, MINIO_BUCKET, SERVER_PORT, SERVER_HOST, BACKEND_URL } from '../config/config.js'; // Import necessary config
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

// Configure Multer for memory storage
export const upload: Multer = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Example: Limit file size to 10MB
});

export async function storeImage(imgFile: any) {
  try {
    const originalFilename = imgFile.originalname;
    const uniqueId = uuidv4(); // Generate a unique identifier
    const uniqueFilename = `${uniqueId}-${originalFilename}`; // Append the unique ID to the filename
    const fileType = imgFile.mimetype;
    const fileBuffer = imgFile.buffer;

    // Generate the presigned URL using the unique filename
    const presignedUrlResponse = await axios.post(`http://${SERVER_HOST}:${SERVER_PORT}/api/generate-presigned-url`, {
      filename: uniqueFilename,
      fileType,
    });

    const presignedUrl = presignedUrlResponse.data.presignedUrl;
    const viewUrl = presignedUrlResponse.data.publicUrl;

    // Upload the file to MinIO using the presigned URL
    await axios.put(presignedUrl, fileBuffer, {
      headers: {
        "Content-Type": fileType,
      },
    });

    return viewUrl; // Return the public URL for the uploaded file
  } catch (error) {
    console.error("Error uploading file with presigned URL:", error);
    throw error;
  }
}

// POST /api/generate-presigned-url
router.post('/api/generate-presigned-url', async (req: Request, res: Response) => {
    try {
      const { filename, fileType } = req.body;

      // Log the received values for debugging
      console.log(`Received filename for presigned URL: ${filename}`);
      console.log(`Received fileType for presigned URL: ${fileType}`);

      if (!filename || !fileType) {
        return res.status(400).json({ error: "Missing filename or fileType" });
      }

      // Use the filename directly as in the original code
      // No unique ID generation or sanitization here to match original logic
      const objectName = filename;

      // Generate a pre-signed URL that expires in 24 hours (as per original implicit duration, adjust if needed)
      const expiry = 24 * 60 * 60; // 24 hours
      const presignedUrl = await minioClient.presignedPutObject(
        MINIO_BUCKET!,
        objectName,
        expiry
      );

      console.log(`Generated presigned PUT URL: ${presignedUrl}`);

      const publicUrl = `http://localhost:9000/${MINIO_BUCKET}/${objectName}`;

      res.status(200).json({
        presignedUrl, // URL for the client/server to PUT the file to
        publicUrl,    // URL to access the file after successful upload (viewUrl in original)
      });
    } catch (error) {
      console.error("Error generating pre-signed URL:", error);
      res.status(500).json({ error: "Failed to generate pre-signed URL" });
    }
});

// PUT /upload-with-presigned-url
router.put('/upload-with-presigned-url', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const { filename, fileType } = req.body; // Get filename/type from body
      const fileBuffer = req.file?.buffer;     // Get file buffer from multer

      if (!req.file || !fileBuffer) {
          return res.status(400).json({ error: "No file uploaded." });
      }

      if (!filename || !fileType) {
        return res.status(400).json({ error: "Missing filename or fileType in request body" });
      }

      // --- Internal call to generate the presigned URL ---
      // Construct the URL to the generate endpoint based on server config
      const generateUrl = `http://${SERVER_HOST}:${SERVER_PORT}/api/generate-presigned-url`;
      console.log(`Internally calling: POST ${generateUrl}`);

      const presignedUrlResponse = await axios.post(generateUrl, {
        filename, // Pass filename and fileType to the generate endpoint
        fileType,
      });
      // --- End of internal call ---

      // Extract URLs from the response of the internal call
      const presignedUrl = presignedUrlResponse.data.presignedUrl;
      const viewUrl = presignedUrlResponse.data.publicUrl; // Use 'viewUrl' to match original variable name

      if (!presignedUrl) {
        console.error("Failed to retrieve presigned URL from internal call.");
        return res.status(500).json({ error: "Internal server error during URL generation step." });
      }

      console.log(`Received presigned URL internally: ${presignedUrl}`);
      console.log(`Received view URL internally: ${viewUrl}`);

      // Upload the file buffer to MinIO using the obtained presigned URL
      console.log(`Uploading buffer to presigned URL: PUT ${presignedUrl.substring(0, 100)}...`); // Log truncated URL
      await axios.put(presignedUrl, fileBuffer, {
        headers: {
          // Set Content-Type based on the fileType provided in the request body
          // (or you could use req.file.mimetype if you trust multer's detection)
          "Content-Type": fileType,
          // Axios might automatically set Content-Length, but you could add it manually:
          // "Content-Length": fileBuffer.length
        },
         // Important for large files: prevent axios from buffering the whole thing in memory again
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      console.log(`Successfully PUT buffer to presigned URL.`);


      // Respond with success and the view URL
      res.status(200).json({
        message: "File uploaded successfully using presigned URL!",
        viewUrl, // Return the viewUrl as in the original code
      });

    } catch (error: any) {
        // Log Axios errors specifically if possible
        if (axios.isAxiosError(error)) {
            console.error("Axios error during upload/presigned URL generation:", error.response?.data || error.message);
        } else {
            console.error("Error uploading file with presigned URL:", error);
        }
        res.status(500).json({ error: "Error processing file upload with presigned URL" });
      }
});


export default router;