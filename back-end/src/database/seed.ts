import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, BUCKET, STORAGE_PUBLIC_HOST, SERVER_HOST, SERVER_PORT, API_BASE_PATHS, POSTS_COLLECTION, USERS_COLLECTION } from '../config/config.js'; // Import S3/Server config
import { PutObjectCommand } from '@aws-sdk/client-s3';

import Post, { IPost } from '../models/Post.js';
import User, { IUser } from '../models/User.js';

// --- Path Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_IMAGES_DIR = path.resolve(__dirname, '../../seed-images');

// --- Helper Function to Seed a SINGLE POST via POST /api/posts Route ---
const seedPostViaRoute = async (
    imageFilename: string,
    authorId: string,
    authorUsername: string,
    likes: number,
    postIndex: number
): Promise<void> => {
    const imageFilePath = path.join(SEED_IMAGES_DIR, imageFilename);
    // Ensure SERVER_HOST and SERVER_PORT are correctly read from config/env
    const targetUrl = `http://${SERVER_HOST || 'localhost'}:${SERVER_PORT}${API_BASE_PATHS.POSTS}`;
    const description = `Post #${postIndex + 1} by ${authorUsername}.`;

    console.log(`[Seed Post Route] Processing: Author ${authorId}, Image ${imageFilename} -> POST ${targetUrl}`);

    try {
        await fs.access(imageFilePath);
        const fileBuffer = await fs.readFile(imageFilePath);
        const fileType = path.extname(imageFilename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

        const formData = new FormData();
        formData.append('authorID', authorId);
        formData.append('description', description);
        formData.append('likes', String(likes)); // Ensure likes is string for FormData if needed
        formData.append('imagePath', fileBuffer, {
            filename: imageFilename,
            contentType: fileType
        });

        console.log(`[Seed Post Route] Sending POST request to ${targetUrl} for post #${postIndex + 1}`);
        const response = await axios.post(targetUrl, formData, {
            headers: { ...formData.getHeaders() },
            maxBodyLength: Infinity, maxContentLength: Infinity
        });

        console.log(`[Seed Post Route] Response status for post #${postIndex + 1}: ${response.status}`);

        if (response.status === 201) {
            console.log(`[Seed Post Route] Successfully seeded post #${postIndex + 1} (ID: ${response.data?._id}) via route.`);
        } else {
            console.error(`[Seed Post Route] Post seeding for post #${postIndex + 1} received unexpected status ${response.status}:`, response.data);
            throw new Error(`Post seeding for post #${postIndex + 1} failed with status ${response.status}.`);
        }
    } catch (error: any) {
        console.error(`[Seed Post Route] Error processing post #${postIndex + 1} (Author: ${authorId}, Image: ${imageFilename}) via route ${targetUrl}:`);
        if (axios.isAxiosError(error)) {
            console.error("Axios Error Status:", error.response?.status);
            console.error("Axios Error Data:", error.response?.data || error.message);
        } else {
             console.error("Error Type:", error.constructor.name);
             console.error("Error Message:", error.message);
             console.error("Error Stack:", error.stack);
        }
    }
};

// --- Helper Function to Upload Seed Image ---
const uploadSeedImageDirectly = async (filename: string): Promise<string> => {
    const imageFilePath = path.join(SEED_IMAGES_DIR, filename);
    console.log(`[Seed Direct Upload] Processing: ${filename}`);

    if (!BUCKET) {
        console.error("[Seed Direct Upload] BUCKET environment variable is not set.");
        return `https://via.placeholder.com/150/FF0000/FFFFFF/?text=NoBucket`;
    }

    try {
        await fs.access(imageFilePath);
        const fileBuffer = await fs.readFile(imageFilePath);
        const fileType = path.extname(filename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

        // Create a unique key for S3/Minio
        const originalFilename = path.basename(filename);
        // Basic sanitization
        const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueId = uuidv4();
        const extension = path.extname(sanitizedFilename);
        const baseName = path.basename(sanitizedFilename, extension);
        // Add a prefix to distinguish seed images if desired
        const objectKey = `seed-profiles/${uniqueId}-${baseName}${extension}`;

        console.log(`[Seed Direct Upload] Uploading '${objectKey}' to bucket '${BUCKET}'`);

        const putCommand = new PutObjectCommand({
            Bucket: BUCKET,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: fileType,
        });

        await s3Client.send(putCommand);

        // Construct the public URL using STORAGE_PUBLIC_HOST from config
        const viewUrl = `${STORAGE_PUBLIC_HOST}/${BUCKET}/${objectKey}`;

        console.log(`[Seed Direct Upload] Successfully uploaded ${filename}. URL: ${viewUrl}`);
        return viewUrl;

    } catch (error: any) {
        console.error(`[Seed Direct Upload] Error uploading profile image ${filename}:`, error.message || error);
        if (error instanceof Error) {
             console.error(`[Seed Direct Upload] Error Name: ${error.name}`);
        }
        // Return a placeholder on error to allow seeding to potentially continue
        return `https://via.placeholder.com/150/FF0000/FFFFFF/?text=UploadError`;
    }
};


// --- Main Seeding Function ---
export const initializeData = async (): Promise<void> => {
    console.log("--- Starting Data Seeding Process ---");
    try {
        try {
            await fs.access(SEED_IMAGES_DIR);
            console.log(`[Seed] Found seed image directory: ${SEED_IMAGES_DIR}`);
        } catch (err) {
            console.error(`❌ Error: Seed image directory not found at ${SEED_IMAGES_DIR}. Cannot seed images.`);
            // Decide if this is fatal or just prevents image seeding
             throw new Error(`Seed image directory missing: ${SEED_IMAGES_DIR}`);
        }

        // List of base filenames
        const availableImageFiles = [
            "avatar.jpeg", "bonsai.jpeg", "bridge.jpeg", "man.jpeg", "mountain.jpeg",
            "eye.jpeg", "camera.jpeg", "elephant.jpeg", "hooter.jpeg", "error.png",
            "crash.jpeg", "zion.jpeg", "joshua.jpeg", "goggles.jpeg", "puppy.jpeg",
            "jpeg.jpeg", "temple.jpeg", "spirit.jpeg", "12th-street.jpeg",
            "learning.jpeg", "stale.jpeg", "smart.jpeg", "godzilla.jpeg", "schedule.jpeg",
            "equality.jpeg", "manatee.jpeg", "dijkstra.jpeg", "acadia.jpeg", "squirrel.jpeg",
        ];

        // --- User Initialization ---
        const userCount = await User.countDocuments();
        let insertedUsers: IUser[] = [];

        if (userCount > 0) {
            console.log(`[Seed] Collection '${USERS_COLLECTION}' already populated. Skipping user seeding, fetching existing users.`);
            // Ensure existing users are fetched correctly if needed for post seeding
             insertedUsers = await User.find();
        } else {
            console.log(`[Seed] Seeding initial users for '${USERS_COLLECTION}'...`);
            const initialUserDefs = [ // Your user definitions here...
                 { googleId: "abby123", username: "abby123", bio: "I love hiking and nature!" },
                { googleId: "benny_2000", username: "benny_2000", bio: "Tech enthusiast and software developer." },
                { googleId: "char1ieIsC00L", username: "char1ieIsC00L", bio: "Just a cool guy who loves coding." },
                { googleId: "danny_dev", username: "danny_dev", bio: "A developer who loves to create amazing things." },
                { googleId: "emma_writes", username: "emma_writes", bio: "Book lover and aspiring writer." },
                { googleId: "frankie_fox", username: "frankie_fox", bio: "Nature photographer and adventurer." },
                { googleId: "graceful_gal", username: "graceful_gal", bio: "Dancer and art lover." },
                { googleId: "harry_hiker", username: "harry_hiker", bio: "Exploring the world one trail at a time." },
                { googleId: "ivy_illustrator", username: "ivy_illustrator", bio: "Digital artist and coffee enthusiast." },
                { googleId: "jackson_jazz", username: "jackson_jazz", bio: "Musician and vinyl collector." },
                { googleId: "karen_knits", username: "karen_knits", bio: "Knitting my way through life." },
                { googleId: "leo_lens", username: "leo_lens", bio: "Capturing moments through my camera." },
                { googleId: "mia_muse", username: "mia_muse", bio: "Writer and dreamer." },
                { googleId: "nate_nomad", username: "nate_nomad", bio: "Traveling the world, one city at a time." },
                { googleId: "olivia_ocean", username: "olivia_ocean", bio: "Beach lover and marine biologist." },
                { googleId: "peter_painter", username: "peter_painter", bio: "Painting the world in vibrant colors." },
                { googleId: "quincy_quill", username: "quincy_quill", bio: "Poet and storyteller." },
                { googleId: "ruby_runner", username: "ruby_runner", bio: "Marathoner and fitness enthusiast." },
                { googleId: "sam_sculptor", username: "sam_sculptor", bio: "Sculpting life one piece at a time." },
                { googleId: "tina_traveler", username: "tina_traveler", bio: "Wanderlust and cultural explorer." },
                { googleId: "ulysses_uplift", username: "ulysses_uplift", bio: "Motivational speaker and life coach." },
                { googleId: "violet_vision", username: "violet_vision", bio: "Fashion designer and trendsetter." },
                { googleId: "will_writer", username: "will_writer", bio: "Author and creative thinker." },
                { googleId: "xena_xplorer", username: "xena_xplorer", bio: "Explorer of the unknown." },
                { googleId: "yara_yogi", username: "yara_yogi", bio: "Yoga instructor and wellness advocate." },
                { googleId: "zane_zenith", username: "zane_zenith", bio: "Tech innovator and entrepreneur." }
            ];

            const usersToInsertPromises = initialUserDefs.map(async (userDef) => {
                try {
                    const randomImageFile = availableImageFiles[Math.floor(Math.random() * availableImageFiles.length)];
                    const profilePicUrl = await uploadSeedImageDirectly(randomImageFile);
                    return { ...userDef, profilePicPath: profilePicUrl };
                } catch (uploadError) {
                     console.error(`[Seed] Failed to upload profile picture during user definition for ${userDef.username}:`, uploadError);
                    return { ...userDef, profilePicPath: 'https://via.placeholder.com/150/CCCCCC/FFFFFF/?text=NoPic' };
                }
            });

            // Wait for all uploads/definitions to complete (or fail gracefully)
            const userResults = await Promise.allSettled(usersToInsertPromises);

            // Filter out any potential rejections if needed, though uploadSeedImageDirectly returns placeholder now
            const usersToInsert = userResults
                .filter(result => result.status === 'fulfilled')
                .map(result => (result as PromiseFulfilledResult<any>).value);

            if (usersToInsert.length > 0) {
                console.log('[Seed] Inserting initial user data into MongoDB...');
                insertedUsers = await User.insertMany(usersToInsert) as IUser[];
                console.log(`[Seed] ${insertedUsers.length} initial users added.`);
            } else {
                 console.warn("[Seed] No users could be prepared for insertion. Check upload errors above.");
            }
        }

        // --- Post Initialization ---
        const postCount = await Post.countDocuments();
        if (postCount > 0) {
            console.log(`[Seed] Collection '${POSTS_COLLECTION}' already populated. Skipping post seeding.`);
        } else {
             if (insertedUsers.length === 0) {
                console.warn("[Seed] No users available (either existed or failed seeding). Cannot seed posts.");
             } else {
                console.log(`[Seed] Seeding initial posts for '${POSTS_COLLECTION}' via POST /api/posts route...`);
                const totalPostsToCreate = 100;
                const postCreationPromises: Promise<void>[] = [];

                for (let i = 0; i < totalPostsToCreate; i++) {
                    const randomUser = insertedUsers[Math.floor(Math.random() * insertedUsers.length)];
                    const randomImageFile = availableImageFiles[Math.floor(Math.random() * availableImageFiles.length)];
                    const promise = seedPostViaRoute(
                        randomImageFile,
                        randomUser._id.toString(),
                        randomUser.username || `User_${i}`,
                        Math.floor(Math.random() * 101),
                        i
                    );
                    postCreationPromises.push(promise);
                     if (postCreationPromises.length % 10 === 0 || postCreationPromises.length === totalPostsToCreate) {
                         console.log(`[Seed Post Route] Queued ${postCreationPromises.length}/${totalPostsToCreate} post seeding requests...`);
                     }
                }

                console.log(`[Seed Post Route] Executing ${postCreationPromises.length} post creation requests...`);
                const results = await Promise.allSettled(postCreationPromises);
                console.log(`[Seed Post Route] Finished executing post creation requests.`);

                const successfulCount = results.filter(r => r.status === 'fulfilled').length;
                const failedCount = results.length - successfulCount;

                if (failedCount > 0) {
                     console.warn(`[Seed Post Route] ${failedCount} out of ${results.length} post seeding requests failed. Check logs above for details.`);
                }
                console.log(`[Seed] Successfully attempted seeding for ${successfulCount} posts via the /api/posts route.`);

             }
        }
        console.log("--- Data Seeding Process Completed ---");

    } catch (error) {
        console.error("--- Error During Data Seeding Process ---");
        console.error(error instanceof Error ? error.message : error);
    }
};