import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import Post, { IPost } from '../models/Post.js';
import { storeImage, upload } from './upload.js';

const router: Router = express.Router();

// GET /api/posts
router.get('/', async (req: Request, res: Response) => {
  try {
    const posts: IPost[] = await Post.find({}).sort({ createdAt: -1 }); // Fetch newest first
    res.json(posts);
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error fetching posts" });
  }
});

// POST /api/posts
router.post('/', upload.single("imagePath"), async (req: Request, res: Response) => {
  try {
    // Extract post data from the request body
    let newPostData: Partial<IPost> = req.body;

    // Handle file upload
    const imageFile = req.file;
    if (imageFile) {
      const imageURL = await storeImage(imageFile);
      console.log(`File uploaded successfully to MinIO: ${imageURL}`);
      newPostData.imagePath = imageURL;
    }

    // Create the post in the database
    const createdPost = await Post.create(newPostData);

    // Update the user's authoredPostIDs
    if (newPostData.authorID) {
      await mongoose.model('User').findByIdAndUpdate(
        newPostData.authorID,
        { $push: { authoredPostIDs: createdPost._id } },
        { new: true, useFindAndModify: false }
      );
      console.log(`User ${newPostData.authorID} updated with new post ID: ${createdPost._id}`);
    }

    res.status(201).json(createdPost); // 201 Created status
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
      console.error("Post Validation Error:", error.message);
      return res.status(400).json({ error: error.message });
    }
    console.error("Error adding post:", error);
    res.status(500).json({ error: "Failed to add post" });
  }
});

// GET /api/posts/user/:userId
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const posts: IPost[] = await Post.find({ authorID: userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error: any) {
    console.error("Error fetching user's posts:", error);
    res.status(500).json({ error: "Internal server error fetching user's posts" });
  }
});

// TODO: add get, put routes for posts

export default router;