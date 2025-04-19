import { Client as MinioClient } from "minio";

// --- MongoDB Configuration ---
const MONGO_DB = process.env.MONGO_DB;
const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT;
export const USERS_COLLECTION = process.env.USERS_COLLECTION;
export const POSTS_COLLECTION = process.env.POSTS_COLLECTION;
export const COMMENTS_COLLECTION = process.env.COMMENTS_COLLECTION;

if (!MONGO_DB || !MONGO_HOST || !MONGO_PORT) {
  console.error("Error: Missing required MongoDB environment variables (MONGO_DB, MONGO_HOST, MONGO_PORT)!");
  process.exit(1);
}

export const MONGO_URI = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;

// --- Server Configuration ---
export const SERVER_HOST = process.env.SERVER_HOST;
export const SERVER_PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 7005;
export const BACKEND_URL = process.env.BACKEND_URL;

if (isNaN(SERVER_PORT)) {
    console.error("Error: Invalid SERVER_PORT environment variable!");
    process.exit(1);
}

// --- API Endpoints ---
export const API_BASE_PATHS = {
    AUTH: '/api/auth',
    USERS: `/api/${USERS_COLLECTION}`,
    POSTS: `/api/${POSTS_COLLECTION}`,
    COMMENTS: `/api/${COMMENTS_COLLECTION}`
};

// --- Minio Configuration ---
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT_STR = process.env.MINIO_PORT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
export const BUCKET = process.env.BUCKET;
export const MINIO_PUBLIC_HOST = process.env.MINIO_PUBLIC_HOST || `${MINIO_ENDPOINT}:${MINIO_PORT_STR}`;

let MINIO_PORT: number;

if (!MINIO_ENDPOINT || !MINIO_PORT_STR || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY || !BUCKET) {
  console.error("Error: Missing required Minio environment variables (MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, BUCKET)!");
  process.exit(1);
}

try {
    MINIO_PORT = parseInt(MINIO_PORT_STR, 10);
    if (isNaN(MINIO_PORT)) throw new Error("MINIO_PORT must be a number");
} catch (error) {
    console.error("Error: Invalid MINIO_PORT environment variable:", error);
    process.exit(1);
}

// MinIO Client Instance (Exported for use in routes/services)
export const minioClient = new MinioClient({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: false, // Configure based on your Minio setup
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

// --- MinIO Bucket Initialization ---
(async () => {
  const bucketName = BUCKET;
  const region = process.env.MINIO_REGION || 'us-east-1';

  try {
    console.log(`Checking if MinIO bucket "${bucketName}" exists...`);
    const exists = await minioClient.bucketExists(bucketName);

    if (!exists) {
      console.log(`Bucket "${bucketName}" does not exist. Creating...`);
      await minioClient.makeBucket(bucketName, region);
      console.log(`Bucket "${bucketName}" created successfully in region "${region}".`);
    } else {
      console.log(`Bucket "${bucketName}" already exists.`);
    }

    // Define the public read policy
    // This policy allows anyone (*) to perform GetObject on any object (/*) within the bucket.
    const publicPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    console.log(`Setting public-read policy for bucket "${bucketName}"...`);
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(publicPolicy));
    console.log(`Public-read policy set for bucket "${bucketName}".`);

    console.log(`MinIO bucket "${bucketName}" initialization complete.`);

  } catch (err: any) {
    console.error(`Error initializing MinIO bucket "${bucketName}":`, err.message || err);
  }
})(); // Execute the async function immediately

// --- End MinIO Bucket Initialization ---

console.log("Configuration loaded successfully.");