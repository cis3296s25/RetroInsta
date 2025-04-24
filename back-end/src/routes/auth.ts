import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User.js';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

const router: Router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID) {
  console.error("FATAL ERROR: GOOGLE_CLIENT_ID env variable not set.");
  process.exit(1); // fail
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// GET /api/auth/google/config
router.get('/google/config', (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    console.error("Config request failed: GOOGLE_CLIENT_ID not set on server.");
    return res.status(500).json({ error: "Server configuration error." });
  }
  res.status(200).json({ clientId: GOOGLE_CLIENT_ID });
});

// POST /api/auth/google/login
router.post('/google/login', async (req: Request, res: Response) => {
  const { idToken } = req.body; 

  if (!idToken) {
    return res.status(400).json({ error: "Missing idToken in request body"});
  }


  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload: TokenPayload | undefined = ticket.getPayload();

    if (!payload) {
      console.error("Google token verification failed: No payload received.");
      return res.status(401).json({ error: "Invalid Google token: No payload" });
    }

    const googleId = payload.sub; // 'sub' is the unique Google User ID
    const email = payload.email;
    const profilePicPath = payload.picture;

    if (!googleId || !email) {
      console.error("Google token verification failed: Missing sub or email in payload.", payload);
      return res.status(401).json({ error: "Invalid Google token: Missing required fields" });
    }

    let user = await User.findOne({ googleId: googleId });

    if (user) {
      console.log(`User found: ${user.username}`);
      return res.status(200).json(user); // Return existing user
    }

    // If user doesn't exist, create a new one
    const username = email.split('@')[0]; // everything before the '@'
  
    const newUser_Data = {
      googleId: googleId,
      username: username,
      profilePicPath: profilePicPath
    };

    // Create user with only required fields, let mongoose handle defaults/timestamps
    const createdUser = await User.create(newUser_Data);

    console.log(`New user created: ${createdUser.username}`);
    res.status(201).json(createdUser); // 201 Created status
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.error("Validation Error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    // Handle potential duplicate key errors during create
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      console.error(`Duplicate key error for field: ${field} with value: ${value}`);
      // Attempt to find the conflicting user to return it, simulating login
      if (field === 'googleId' || field === 'email') {
        const conflictingUser = await User.findOne({ [field]: value });
        if (conflictingUser) {
          console.warn(`Conflict resolved: Returning existing user with ${field}=${value}`);
          return res.status(200).json(conflictingUser);
        }
      }
      // If not resolved or duplicate is username, return conflict error
      return res.status(409).json({ error: `User creation failed: ${field} must be unique.` });
    }

    console.error("Error during Google login/user creation:", error);
    res.status(500).json({ error: "Internal server error during login process" });
  }
});

export default router; // Export the router