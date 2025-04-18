import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';

// Configuration - Adjust path as needed
import {
    POSTS_COLLECTION,
    USERS_COLLECTION,
    SERVER_HOST,
    SERVER_PORT,
    API_BASE_PATHS // <--- ADD THIS IMPORT
} from '../config/config.js';

// Models - Adjust paths as needed
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
    postIndex: number
): Promise<void> => {
    const imageFilePath = path.join(SEED_IMAGES_DIR, imageFilename);
    // Now API_BASE_PATHS.POSTS will be found
    const targetUrl = `http://${SERVER_HOST}:${SERVER_PORT}${API_BASE_PATHS.POSTS}`;
    const description = `Post #${postIndex + 1} by ${authorUsername}.`;

    console.log(`[Seed Post Route] Processing: Author ${authorId}, Image ${imageFilename} -> POST ${targetUrl}`);

    try {
        // ... (rest of the function remains the same) ...
        await fs.access(imageFilePath);
        const fileBuffer = await fs.readFile(imageFilePath);
        const fileType = path.extname(imageFilename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

        const formData = new FormData();
        formData.append('authorID', authorId);
        formData.append('description', description);
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
        throw new Error(`Failed to seed post #${postIndex + 1} via route: ${error.message}`);
    }
};

// --- Helper Function to Upload User Profile Image (Still needed for users) ---
const uploadUserProfileImageViaRoute = async (filename: string): Promise<string> => {
    // ... (this function remains the same) ...
    const filePath = path.join(SEED_IMAGES_DIR, filename);
    const targetUrl = `http://${SERVER_HOST}:${SERVER_PORT}/upload-with-presigned-url`;
    // console.log(`[Seed User Image Upload] Processing image: ${filename} -> PUT ${targetUrl}`);
    try {
        await fs.access(filePath);
        const fileBuffer = await fs.readFile(filePath);
        const fileType = path.extname(filename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

        const formData = new FormData();
        formData.append('filename', filename);
        formData.append('fileType', fileType);
        formData.append('file', fileBuffer, { filename: filename, contentType: fileType });

        const response = await axios.put(targetUrl, formData, {
            headers: { ...formData.getHeaders() },
            maxBodyLength: Infinity, maxContentLength: Infinity
        });

        if (response.status === 200 && response.data?.viewUrl) {
            // console.log(`[Seed User Image Upload] Successfully uploaded ${filename}, URL: ${response.data.viewUrl}`);
            return response.data.viewUrl;
        } else {
             console.error(`[Seed User Image Upload] Upload for ${filename} failed or response missing 'viewUrl': Status ${response.status}`, response.data);
            throw new Error(`User profile image upload for ${filename} failed.`);
        }
    } catch (error:any) {
        console.error(`[Seed User Image Upload] Error uploading profile image ${filename} via PUT route ${targetUrl}:`, error.message);
         if (axios.isAxiosError(error)) console.error("Axios Error Data:", error.response?.data);
        throw error;
    }
};


// --- Main Seeding Function ---
export const initializeData = async (): Promise<void> => {
    // ... (rest of initializeData remains the same) ...
    console.log("--- Starting Data Seeding Process ---");
    try {
        // --- Check Seed Image Directory ---
        try {
            await fs.access(SEED_IMAGES_DIR);
            console.log(`[Seed] Found seed image directory: ${SEED_IMAGES_DIR}`);
        } catch (err) {
            console.error(`❌ Error: Seed image directory not found at ${SEED_IMAGES_DIR}`);
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
        let insertedUsers: (IUser & { _id: mongoose.Types.ObjectId })[] = [];

        if (userCount > 0) {
            console.log(`[Seed] Collection '${USERS_COLLECTION}' already populated. Skipping user seeding, fetching existing users.`);
            insertedUsers = await User.find();
        } else {
            console.log(`[Seed] Seeding initial users for '${USERS_COLLECTION}'...`);
            const initialUserDefs = [ /* Your user definitions */
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
                const randomImageFile = availableImageFiles[Math.floor(Math.random() * availableImageFiles.length)];
                const profilePicUrl = await uploadUserProfileImageViaRoute(randomImageFile);
                return { ...userDef, profilePicPath: profilePicUrl };
            });
            const usersToInsert = await Promise.all(usersToInsertPromises);

            console.log('[Seed] Inserting initial user data into MongoDB...');
            insertedUsers = await User.insertMany(usersToInsert);
            console.log(`[Seed] ${insertedUsers.length} initial users added.`);
        }

        // --- Post Initialization ---
        const postCount = await Post.countDocuments();
        if (postCount > 0) {
            console.log(`[Seed] Collection '${POSTS_COLLECTION}' already populated. Skipping post seeding.`);
        } else {
             if (insertedUsers.length === 0) {
                console.warn("[Seed] No users available. Cannot seed posts.");
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

                const failedCount = results.filter(r => r.status === 'rejected').length;
                if (failedCount > 0) {
                     console.warn(`[Seed Post Route] ${failedCount} out of ${totalPostsToCreate} post seeding requests failed. Check logs above for details.`);
                } else {
                     console.log(`[Seed] Successfully seeded ${totalPostsToCreate - failedCount} posts via the /api/posts route.`);
                }
             }
        }
        console.log("--- Data Seeding Process Completed ---");

    } catch (error) {
        console.error("--- Error During Data Seeding Process ---");
        console.error(error instanceof Error ? error.message : error);
    }
};