import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import Post, { IPost } from '../models/Post.js';
import { storeImage, upload } from './upload.js';
import User from '../models/User.js';

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

// PATCH /api/posts/:id/like
router.patch('/:id/like', async (req: Request, res: Response) => {
  const { id: postID } = req.params;
  const { userID } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(postID) || 
    !mongoose.Types.ObjectId.isValid(userID)
  ) {
    return res.status(400).json({ error: "Invalid format for id or userID" });
  }

  try {
    const user = await User.findById(userID);
    const post = await Post.findById(postID);

    if (!user || !post) {
      return res.status(404).json({ error: "User or Post not found" });
    }

    const postObjectId = new mongoose.Types.ObjectId(postID);

    if (user.likedPostIDs.includes(postObjectId)) {
      user.likedPostIDs = user.likedPostIDs.filter(id => !id.equals(postObjectId));
      post.likes = Math.max(0, (post.likes ?? 0) - 1); // Ensure likes don't go below 0
    } else {
      if (!user.likedPostIDs.some(id => id.equals(postObjectId))) {
        user.likedPostIDs.push(postObjectId);
      }
      post.likes = (post.likes ?? 0) + 1;
    }

    await user.save();
    await post.save();

    return res.status(200).json({ 
      message: user.likedPostIDs.includes(postObjectId) 
        ? "Like added successfully" 
        : "Like removed successfully",
      likes: post.likes,
    });
  } catch (error: any) {
    console.error("Error liking/unliking post:", error);
    return res.status(500).json({ error: "Failed to add or remove like" });
  }
});


export default router;