import { User } from '../models/User';
import { BACKEND_URL } from './config';

export const fetchGoogleClientId = async (): Promise<string> => {
    const targetUrl = `${BACKEND_URL}/api/auth/google/config`;
    
    console.log(`[API] Fetching Google Client ID`);
    try {
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Google Client ID: Status ${response.status}`);
        }
        
        const data = await response.json()
        if (!data.clientId) {
            throw new Error("Client ID not found in response from back end.");
        }
        
        console.log("[API] Google Client ID fetched successfully.");
        return data.clientId;
    } catch (error) {
        console.error("[API] Error fetching Google Client ID:", error);
        throw error;
    }
};

interface GoogleLoginPayload {
    idToken: string
}

/**
 * Sends Google login details to the backend to find or create a user.
 * @param payload - The login details containing googleId, email, and profilePicPath.
 * @returns A promise that resolves to the User object from the backend.
 */
export const loginWithGoogleApi = async (payload: GoogleLoginPayload): Promise<User> => {
    if (!payload.idToken) throw new Error("Missing idToken on login payload");

    const targetUrl = `${BACKEND_URL}/api/auth/google/login`;
    console.log(`[API] Attempting Google login POST (with ID token) to: ${targetUrl}`);
    try {
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData?.error || `Backend Google login failed with status ${response.status}`;
            console.error(`[API] Error during Google login: ${errorMessage}`, responseData);
            throw new Error(errorMessage);
        }

        console.log("[API] Google login successful, user data received:", responseData);
        return responseData as User;
    } catch (error) {
        console.error(`[API] Network or parsing error during Google login:`, error);
        if (error instanceof Error) throw error;
        throw new Error("An unknown error occurred during the login process.");
    }
};