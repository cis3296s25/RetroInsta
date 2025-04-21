import { S3Client } from "@aws-sdk/client-s3";
import { Client as MinioClient } from "minio"; // Keep Minio client for dev setup

// --- Environment Setup ---
const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("Error: Missing required MongoDB configuration MONGO_URI!");
    process.exit(1);
}
export { MONGO_URI };

export const USERS_COLLECTION = process.env.USERS_COLLECTION;
export const POSTS_COLLECTION = process.env.POSTS_COLLECTION;
export const COMMENTS_COLLECTION = process.env.COMMENTS_COLLECTION;


// --- Server Configuration ---
export const SERVER_HOST = process.env.SERVER_HOST || '0.0.0.0';
export const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 7005);
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

// --- S3/Minio Configuration ---
export const BUCKET = process.env.BUCKET; // Use BUCKET from .env
const AWS_REGION = process.env.AWS_REGION || 'us-east-2'; // Default AWS Region

// Read Minio connection details directly using your .env variable names
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT_STR = process.env.MINIO_PORT;
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;

if (!BUCKET) {
    console.error("Error: Missing required environment variable: BUCKET!");
    process.exit(1);
}

let s3Config: ConstructorParameters<typeof S3Client>[0] = {};
let minioPortNum: number = 9000; // Keep track of the parsed port for local use

if (IS_PRODUCTION) {
    if (!AWS_REGION) {
        console.error("Error: Missing required environment variable for production: AWS_REGION");
        process.exit(1);
    } 
    
    if (!BUCKET) {
        console.error("Error: Missing required environment variable for production: BUCKET");
        process.exit(1);
    }

    console.log(`[Config] Production mode. Configuring S3 client for AWS region ${AWS_REGION}.`);
    s3Config = {
        region: AWS_REGION,
    };
} else {
    // Local Development targeting Minio
    console.log(`[Config] Development mode. Configuring S3 client for Minio.`);

    // Validate local Minio variables from your .env
    if (!MINIO_ENDPOINT || !MINIO_PORT_STR || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
         console.error("Error: Missing one or more Minio variables for local dev (MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)");
         process.exit(1);
    }
    try {
        minioPortNum = parseInt(MINIO_PORT_STR, 10);
        if (isNaN(minioPortNum)) throw new Error("MINIO_PORT must be a number");
    } catch(e) {
         console.error("Error: Invalid MINIO_PORT:", e);
         process.exit(1);
    }

    s3Config = {
        endpoint: `http://${MINIO_ENDPOINT}:${minioPortNum}`, // Use your .env vars
        region: AWS_REGION, // Dummy region for Minio OK
        credentials: {
            accessKeyId: MINIO_ACCESS_KEY, // Use your .env var
            secretAccessKey: MINIO_SECRET_KEY, // Use your .env var
        },
        forcePathStyle: true, // IMPORTANT for Minio
    };

    // --- Local Minio Bucket Initialization (Run ONLY in Development) ---
    (async () => {
        console.log('[Minio Dev Init] Attempting local Minio bucket setup...');
        try {
            const tempMinioClient = new MinioClient({
                endPoint: MINIO_ENDPOINT!, // Use your .env var
                port: minioPortNum,        // Use parsed port
                useSSL: false,
                accessKey: MINIO_ACCESS_KEY!, // Use your .env var
                secretKey: MINIO_SECRET_KEY!, // Use your .env var
            });

            const bucketName = BUCKET!;
            const region = 'us-east-1'; // Minio default

            console.log(`[Minio Dev Init] Checking if bucket "${bucketName}" exists...`);
            const exists = await tempMinioClient.bucketExists(bucketName);

            if (!exists) {
                console.log(`[Minio Dev Init] Bucket "${bucketName}" does not exist. Creating...`);
                await tempMinioClient.makeBucket(bucketName, region);
                console.log(`[Minio Dev Init] Bucket "${bucketName}" created successfully.`);

                const publicPolicy = { /* ... same policy JSON as before ... */
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

                console.log(`[Minio Dev Init] Setting public-read policy for bucket "${bucketName}"...`);
                await tempMinioClient.setBucketPolicy(bucketName, JSON.stringify(publicPolicy));
                console.log(`[Minio Dev Init] Public-read policy set for bucket "${bucketName}".`);
            } else {
                console.log(`[Minio Dev Init] Bucket "${bucketName}" already exists. Skipping creation/policy set.`);
            }
             console.log(`[Minio Dev Init] Local Minio bucket "${bucketName}" setup check complete.`);

        } catch (err: any) {
            // Make error more informative if Minio container isn't ready
            if (err.code === 'ECONNREFUSED') {
                 console.error(`[Minio Dev Init] Error connecting to Minio at ${MINIO_ENDPOINT}:${minioPortNum}. Is the Minio container running and ready?`);
            } else {
                 console.error(`[Minio Dev Init] Error initializing Minio bucket "${BUCKET}" locally:`, err.message || err);
            }
            // Consider not exiting fatally here to allow app to start if Minio setup fails temporarily
            // process.exit(1);
        }
    })(); // Execute the async function immediately
    // --- End Local Minio Bucket Initialization ---
}

// Instantiate the S3 client (used for both Minio and S3)
export const s3Client = new S3Client(s3Config);

// --- Public URL Construction ---
export const STORAGE_PUBLIC_HOST = IS_PRODUCTION
    ? `https://${BUCKET}.s3.${AWS_REGION}.amazonaws.com` // Correct base for S3 virtual-hosted
    : `http://localhost:${minioPortNum}`;               // Correct base for Minio local access

console.log(`Configuration loaded successfully. NODE_ENV=${NODE_ENV}`);