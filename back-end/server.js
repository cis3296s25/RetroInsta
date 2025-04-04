// sets up MongoDB server
import {MongoClient} from 'mongodb';
import express from 'express';
import cors from 'cors';
import { Client as MinioClient } from "minio";
import axios from 'axios';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });


// const DATABASE_USERNAME = process.env.MONGO_INITDB_ROOT_USERNAME;
// const DATABASE_PASSWORD = process.env.MONGO_INITDB_ROOT_PASSWORD;
const DATABASE_DB = process.env.MONGO_INITDB_DATABASE;
const DATABASE_HOST = process.env.DATABASE_HOST;
const DATABASE_PORT = process.env.DATABASE_PORT;
const DATABASE_COLLECTION = process.env.DATABASE_COLLECTION;

const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = process.env.SERVER_PORT;

// minio
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = process.env.MINIO_PORT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET;

const URI = `mongodb://${DATABASE_HOST}:${DATABASE_PORT}`;
const client = new MongoClient(URI);
const app = express();
// Enable CORS to allow requests from your React frontend
app.use(cors());
// Middleware to parse JSON request bodies
app.use(express.json());

// minio client
const minioClient = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

async function main() {
  try {
    // Connect to Mongo
    await client.connect();
    console.log('Connected to Mongo!');

    // Declare database and collection variables retrieved from client
    const db = client.db(DATABASE_DB);
    const collection = db.collection(DATABASE_COLLECTION);

    app.put("/upload-with-presigned-url", upload.single('file'), async (req, res) => {
      try {
        const { filename, fileType } = req.body;
        const fileBuffer = req.file?.buffer;
    
        if (!filename || !fileType || !fileBuffer) {
          return res.status(400).json({ error: "Missing filename, fileType, or fileBuffer" });
        }
    
        // Generate the presigned URL using the provided details (if needed)
        const presignedUrlResponse = await axios.post("http://localhost:7005/api/generate-presigned-url", {
          filename,
          fileType,
        });
    
        const presignedUrl = presignedUrlResponse.data.presignedUrl;
    
        // Upload the file to MinIO using the presigned URL
        await axios.put(presignedUrl, fileBuffer, {
          headers: {
            "Content-Type": fileType,
          },
        });
    
        res.status(200).json({
          message: "File uploaded successfully!",
          presignedUrl, // You can return the presigned URL to show where it was uploaded
        });
      } catch (error) {
        console.error("Error uploading file with presigned URL:", error);
        res.status(500).json({ error: "Error uploading file with presigned URL" });
      }
    });

    // POST endpoint to upload image path to MinIO
    app.post("/api/generate-presigned-url", async (req, res) => {
      try {
        const { filename, fileType } = req.body;

        // Log the received values for debugging
        console.log(`Received filename: ${filename}`);
        console.log(`Received fileType: ${fileType}`);
    
        if (!filename || !fileType) {
          return res.status(400).json({ error: "Missing filename or fileType" });
        }
    
        // Generate a pre-signed URL that expires in 24 hours
        const presignedUrl = await minioClient.presignedPutObject(MINIO_BUCKET, filename, 24 * 60 * 60, {
          'Content-Type': fileType,
        });

        console.log(`Generated presigned URL: ${presignedUrl}`);

        const publicHost = 'localhost:9000'; // or your custom domain
        const publicUrl = `http://${publicHost}/${MINIO_BUCKET}/${filename}`;
    
        res.status(200).json({
          presignedUrl,
          publicUrl,
        });
      } catch (error) {
        console.error("Error generating pre-signed URL:", error);
        res.status(500).json({ error: "Failed to generate pre-signed URL" });
      }
    });    

    // FOR TESTING ONLY: resets collection
    // collection.drop();

    // Adds dummy user data to empty collection
    const count = await collection.count();
    if (count === 0) {
      collection.insertMany([
        { username: "abby123", profilePicPath: "/testimage/avatar.jpeg", imagePath: "/testimage/mountain.jpeg", description: "Check out this beautiful photo!" },
        { username: "benny_2000", profilePicPath: "/testimage/man.jpeg", imagePath: "/testimage/bridge.jpeg", description: "This is a description! Cool beans." },
        { username: "char1ieIsC00L", profilePicPath: "/testimage/avatar.jpeg", imagePath: "/testimage/man.jpeg", description: "hi benny :)" }
      ]);
    }

    // GET endpoint route to fetch all posts
    app.get("/api/data", async (req, res) => {
      try {
        const data = await collection.find({}).toArray();
        res.json(data);
      } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST endpoint route to add a new post
    app.post("/api/data", async (req, res) => {
      try {
        const newPost = req.body;
        const result = await collection.insertOne(newPost);
        res.status(201).json(result);       // Return the inserted post to frontend
      } catch (error) {
        console.error("Error adding post:", error);
        res.status(500).json({ error: "Failed to add post" });
      }
    });

  // launches HTTP server
  app.listen(SERVER_PORT, () => {
    console.log(`Server running on http://localhost:${SERVER_PORT}`);
  });

  } catch (err) {
    console.error('Something went wrong', err);
  }
}

main()
  .then(() => console.log('Server started!'))
  .catch(err => console.error('Something went wrong', err));
