import { BackendPost, DisplayPost } from '../models/Post'; // Adjust path if needed
import { User } from '../models/User';

/**
 * Converts a BackendPost object and its author User object into a DisplayPost object.
 * @param backendPost - The post data fetched from the backend.
 * @param author - The user object corresponding to the backendPost's authorID.
 * @returns A DisplayPost object ready for UI display.
 */
export const convertBackendPostToDisplayPost = (
    backendPost: BackendPost, 
    author: User | null // Allow null author in case user data couldn't be fetched
): DisplayPost | null => { // Return null if author is missing/null

    if (!author) {
        console.warn(`[convertBackendPostToDisplayPost] Author data missing for post ID: ${backendPost._id}. Cannot convert.`);
        return null; // Or handle this case as needed (e.g., return a default structure)
    }

    // Ensure the author's ID matches the post's authorID for safety (optional but good)
    if (backendPost.authorID !== author._id) {
        console.warn(`[convertBackendPostToDisplayPost] Mismatch between post authorID (${backendPost.authorID}) and provided author ID (${author._id}) for post ID: ${backendPost._id}.`);
        // Decide how to handle: return null, trust the provided author, etc.
        // Let's proceed assuming the provided author is correct for this context.
    }

    const { authorID, ...restOfBackendPost } = backendPost;

    return {
        ...restOfBackendPost,
        author: author, // Assign the full author object
    };
};

/**
 * Converts an array of BackendPost objects to an array of DisplayPost objects,
 * requiring a map or cache to look up authors.
 * @param backendPosts - An array of posts from the backend.
 * @param userCache - A record (or Map) where keys are user IDs and values are User objects.
 * @returns An array of DisplayPost objects. Posts whose authors aren't in the cache will be filtered out.
 */
export const convertBackendPostsToDisplayPosts = (
    backendPosts: BackendPost[],
    userCache: Record<string, User> // Or Map<string, User>
): DisplayPost[] => {

    return backendPosts
        .map(post => {
            const author = userCache[post.authorID]; // Look up author in the cache
            return convertBackendPostToDisplayPost(post, author); // Use the single converter
        })
        .filter((post): post is DisplayPost => post !== null); // Filter out any posts where conversion failed (e.g., missing author)
};