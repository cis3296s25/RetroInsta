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


/**
 * Fetches posts by user ID
 * @param userId - The ID of the user whose posts to fetch
 * @returns A promise that resolves to an array of Post objects
 */
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

/**
 * Adds/removed like by user from post
 * @param postID - The id of the post altered
 * @param userID - The id of the user who will like/unlike the post
 */
export const toggleLikePost = async (postID: string, userID: string): Promise<void> => {
    if (!postID || !userID) {
        throw new Error("postID and userID must be defined");
    }

    // Correct the URL to match the backend route
    const targetUrl = `${BACKEND_URL}/api/posts/${postID}/like`;

    try {
        const response = await fetch(targetUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.error || 'Failed to like/unlike post.');
        }

        console.log(`[API] User ${userID} liked/unliked post ${postID}.`);
    } catch (error: any) {
        console.error(`[API] Error for user ${userID} liking/unliking post ${postID}`, error);
    }
};

export const fetchPersonalPosts = async (userId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/posts/personal/${userId}`);
    console.log("Fetch personal posts response status:", res.status);
  
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Failed personal posts response body:", errorText);
      throw new Error("Failed to fetch personal posts");
    }
  
    const data = await res.json();
    console.log("Personal posts parsed JSON data:", data);
    return data;
};
