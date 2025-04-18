// back-end/tests/comments.test.ts

import request from 'supertest';
import mongoose from 'mongoose';
import app, { startServer, shutdown } from '../src/server.js'; // Import start/shutdown
import User, { IUser } from '../src/models/User.js';         // Need User for authorID
import Post, { IPost } from '../src/models/Post.js';         // Need Post for postID
import Comment from '../src/models/Comment.js';       // The model being tested
import { MONGO_URI } from '../src/config/config.js';     // For DB connection

describe('Comments API (/api/comments)', () => {
  let testUserId: mongoose.Types.ObjectId;
  let testPostId: mongoose.Types.ObjectId;
  let testUser: IUser;
  let testPost: IPost;

  // --- Setup: Start server, create base User and Post ---
  beforeAll(async () => {
    console.log('[Test Comments Setup] Starting server...');
    await startServer(); // Connects DB and starts listener
    console.log('[Test Comments Setup] Server started.');

    // Create a user to be the author of comments/posts
    testUser = await User.create({
        googleId: `comment-user-${Date.now()}`,
        username: `commentuser_${Date.now()}`,
        profilePicPath: 'http://example.com/commentuser.jpg'
    });
    testUserId = testUser._id;

    // Create a post for comments to belong to
    testPost = await Post.create({
        authorID: testUserId.toString(),
        imagePath: 'http://example.com/commentpost.jpg', // Doesn't need to exist in Minio for this test
        description: 'Post for comment testing'
    });
    testPostId = testPost._id;

    console.log(`[Test Comments Setup] Test user created: ${testUserId}`);
    console.log(`[Test Comments Setup] Test post created: ${testPostId}`);

  }, 45000); // Increased timeout for server start + setup

  // --- Teardown: Delete base User/Post, stop server ---
  afterAll(async () => {
    console.log('[Test Comments Teardown] Cleaning up test data...');
    // Delete in reverse order of creation/dependency is good practice
    await Post.findByIdAndDelete(testPostId);
    await User.findByIdAndDelete(testUserId);
    console.log('[Test Comments Teardown] Shutting down server...');
    await shutdown(); // Closes server and disconnects DB
    console.log('[Test Comments Teardown] Server shut down.');
  }, 45000); // Increased timeout for teardown

  // --- Cleanup Comments before each test ---
  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  // --- Test Cases ---

  // == GET /api/comments?postID={postID} ==
  describe('GET /api/comments', () => {

    it('should return an empty array when no comments exist for a post', async () => {
      const response = await request(app).get(`/api/comments?postID=${testPostId}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all comments for a specific postID, sorted newest first', async () => {
      // Arrange: Create comments for the test post
      const comment1 = await Comment.create({
        authorID: testUserId.toString(),
        postID: testPostId.toString(),
        commentText: 'This is the first comment'
      });
      // Short delay to ensure distinct createdAt timestamps for sorting check
      await new Promise(resolve => setTimeout(resolve, 10));
      const comment2 = await Comment.create({
        authorID: testUserId.toString(), // Could be different author
        postID: testPostId.toString(),
        commentText: 'This is the second (newer) comment'
      });
       // Create a comment for a *different* post to ensure filtering works
       const differentPostId = new mongoose.Types.ObjectId();
       await Comment.create({
         authorID: testUserId.toString(),
         postID: differentPostId.toString(),
         commentText: 'Comment on another post'
       });

      // Act
      const response = await request(app).get(`/api/comments?postID=${testPostId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2); // Only comments for testPostId
      // Check sorting (newest first)
      expect(response.body[0]).toHaveProperty('_id', comment2._id.toString());
      expect(response.body[0]).toHaveProperty('commentText', comment2.commentText);
      expect(response.body[1]).toHaveProperty('_id', comment1._id.toString());
      expect(response.body[1]).toHaveProperty('commentText', comment1.commentText);
      // Check association
      expect(response.body[0]).toHaveProperty('postID', testPostId.toString());
      expect(response.body[1]).toHaveProperty('postID', testPostId.toString());
    });

    it('should return 400 if postID query parameter is missing', async () => {
      const response = await request(app).get('/api/comments'); // No query param
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'postID query parameter is required');
    });

    // Note: The current route doesn't validate the *format* of postID,
    // it just wouldn't find comments if the ID is valid format but non-existent.
    it('should return an empty array if postID is valid format but has no comments', async () => {
        const nonExistentValidPostId = new mongoose.Types.ObjectId();
        const response = await request(app).get(`/api/comments?postID=${nonExistentValidPostId}`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
  });

  // == POST /api/comments ==
  describe('POST /api/comments', () => {

    it('should create a new comment with valid data', async () => {
      const commentData = {
        authorID: testUserId.toString(),
        postID: testPostId.toString(),
        commentText: 'A valid test comment!'
      };

      const response = await request(app)
        .post('/api/comments')
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('authorID', commentData.authorID);
      expect(response.body).toHaveProperty('postID', commentData.postID);
      expect(response.body).toHaveProperty('commentText', commentData.commentText);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify in DB
      const commentInDb = await Comment.findById(response.body._id);
      expect(commentInDb).not.toBeNull();
      expect(commentInDb?.commentText).toBe(commentData.commentText);
      expect(commentInDb?.authorID).toBe(commentData.authorID);
      expect(commentInDb?.postID).toBe(commentData.postID);
    });

    it('should return 400 if authorID is missing', async () => {
        const commentData = {
            // authorID: testUserId.toString(), // Missing
            postID: testPostId.toString(),
            commentText: 'Comment without author'
        };
        const response = await request(app)
            .post('/api/comments')
            .send(commentData);
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Comment validation failed: authorID: Path `authorID` is required.');
    });

    it('should return 400 if postID is missing', async () => {
        const commentData = {
            authorID: testUserId.toString(),
            // postID: testPostId.toString(), // Missing
            commentText: 'Comment without postID'
        };
        const response = await request(app)
            .post('/api/comments')
            .send(commentData);
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Comment validation failed: postID: Path `postID` is required.');
    });

     it('should return 400 if commentText is missing', async () => {
        const commentData = {
            authorID: testUserId.toString(),
            postID: testPostId.toString(),
            // commentText: 'Missing text' // Missing
        };
        const response = await request(app)
            .post('/api/comments')
            .send(commentData);
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Comment validation failed: commentText: Path `commentText` is required.');
     });

  });

}); // End of main describe block