import { BackendPost } from '../models/Post'; // Adjust path as necessary
import { CreatePostPayload } from '../models/CreatePostData'
import { BACKEND_URL } from './config';

/**
 * Fetches all posts from the backend.
 * @returns A promise that resolves to an array of Post objects.
 */
export const getAllPosts = async (): Promise<BackendPost[]> => {
    const targetUrl = `${BACKEND_URL}/api/posts`;
    console.log(`[API] Fetching posts from: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl);
        console.log(`[API] Fetch posts response status: ${response.status}`);

        if (!response.ok) {
            // Try to get more specific error from response body if possible
            let errorData = { error: `Backend fetch posts failed with status ${response.status}` };
            try {
                errorData = await response.json();
            } catch (e) { /* Ignore parsing error if response wasn't JSON */ }
            throw new Error(errorData.error || `Backend fetch posts failed with status ${response.status}`);
        }

        const data = await response.json();
        
        console.log("[API] Posts fetched successfully:", data.length);
        
        return data as BackendPost[];
    } catch (error) {
        console.error(`[API] Network or parsing error fetching posts:`, error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred while fetching posts.");
    }
};

/**
 * Creates a new post on the backend.
 * @param payload - The data for the new post including authorID and image file.
 * @returns A promise that resolves to the newly created Post object.
 */
export const createPost = async (payload: CreatePostPayload): Promise<BackendPost> => {
    const targetUrl = `${BACKEND_URL}/api/posts`;
    console.log(`[API] Creating post at: ${targetUrl}`, payload);

    if (!payload.authorID || !payload.imageFile) { 
        throw new Error(
            "Missing required fields: authorID or imageFile in createPost payload."
        );
    }
    
    try {
        const formData = new FormData();
        formData.append("authorID", payload.authorID);
        formData.append("imagePath", payload.imageFile);
        if (payload.description) {
            formData.append("description", payload.description);
        }

        const response = await fetch(targetUrl, {
            method: "POST",
            body: formData,
        });

        console.log(`[API] Create post response status: ${response.status}`);

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = await responseData?.text() || `Backend create post failed with status ${response.status}`;
            console.error(`[API] Create post error response:`, errorMessage);
            throw new Error(errorMessage)
        }

        return responseData as BackendPost;
    } catch (error) {
        console.error(`[API] Network or parsing error creating post:`, error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred while creating the post.");
    }
};

/* Fetches posts by user ID */
export const getPostsByUserId = async (userId: string): Promise<BackendPost[]> => {
    const targetUrl = `${BACKEND_URL}/api/posts/user/${userId}`;
    console.log(`[API] Fetching posts for user: ${userId}`);

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch posts for user ${userId}`);
        }
        const data = await response.json();
        return data as BackendPost[];
    } catch (error) {
        console.error(`[API] Error fetching posts for user ${userId}:`, error);
        throw error;
    }
};