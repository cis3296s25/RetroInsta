import { User } from '../models/User';
import { BACKEND_URL } from './config';

/**
 * Fetches user data by their MongoDB ID.
 * @param userId - The MongoDB _id of the user.
 * @returns A promise that resolves to the User object.
 */
export const getUserById = async (userId: string): Promise<User> => {
  if (!userId) throw new Error("User ID is required to fetch user data.");

  const targetUrl = `${BACKEND_URL}/api/users/${userId}`;
//   console.log(`[API] Fetching user data from: ${targetUrl}`);

  try {
      const response = await fetch(targetUrl);
      console.log(`[API] Fetch user by ID response status: ${response.status}`);

      const responseData = await response.json();

      if (!response.ok) {
          const errorMessage = responseData?.error || `Backend fetch user failed with status ${response.status}`;
          console.error(`[API] Error fetching user data: ${errorMessage}`, responseData);
          throw new Error(errorMessage);
      }

      if (!responseData?._id || !responseData?.username) {
          console.error("[API] Received invalid user data structure:", responseData);
          throw new Error("Received invalid user data structure from backend.");
      }

    //   console.log("[API] User data fetched successfully:", responseData);
      return responseData as User;

  } catch (error) {
      console.error(`[API] Network or parsing error fetching user ${userId}:`, error);
      if (error instanceof Error) throw error;
      throw new Error("An unknown error occurred while fetching user data.");
  }
};

/**
 * Adds/removes a user to the current user's following list.
 * @param currentUserId - the ID of the current logged in user
 * @param targetUserID - the ID of the user being followed/unfollowed
 */
 export const toggleFollowUser = async (currentUserId: string, targetUserID: string): Promise<void> => {
    const targetUrl = `${BACKEND_URL}/api/users/${currentUserId}/follow`;

    try {
      const response = await fetch(targetUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserID }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'Failed to follow/unfollow user.');
      }

      console.log(`[API] User ${currentUserId} followed/unfollowed ${targetUserID}`);
    } catch (err) {
      console.error('[API] Error in followUser():', err);
      throw err;
    }
};

/**
 * Updates a user's bio.
 * @param currentUserId - the id of the current logged in user
 * @param newBio - the updated text of the bio 
 */
export const updateBio = async (currentUserId: string, newBio: string): Promise<void> => {
  const targetUrl = `${BACKEND_URL}/api/users/${currentUserId}/bio`;

  try {
    const response = await fetch(targetUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newBio })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || 'Failed to update user bio.');
    }
  } catch (error) {
    console.error('[API] Error in updating bio:', error);
    throw error;
  }
};
