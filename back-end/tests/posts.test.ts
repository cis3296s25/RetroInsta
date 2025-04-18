import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import app, { startServer, shutdown } from '../src/server.js';
import Post from '../src/models/Post.js';
import User from '../src/models/User.js';
import { MONGO_URI, MINIO_BUCKET } from '../src/config/config.js';
import { minioClient } from '../src/config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Posts API (/api/posts)', () => {
  let testUserId: mongoose.Types.ObjectId;

  // --- Setup: Start server and create user ---
  beforeAll(async () => {
    console.log('[Test Setup] Starting server...');
    await startServer();
    console.log('[Test Setup] Server started.');

    const testUser = await User.create({
      googleId: `test-user-${Date.now()}`,
      username: `testuser_${Date.now()}`,
      profilePicPath: 'http://example.com/test.jpg'
    });
    testUserId = testUser._id;
    console.log(`[Test Setup] Test user created: ${testUserId}`);
  }, 45000); // Increased timeout for server start + user creation

  // --- Teardown: Delete user and stop server ---
  afterAll(async () => {
    if (testUserId) {
        console.log(`[Test Teardown] Deleting test user: ${testUserId}`);
        await User.findByIdAndDelete(testUserId);
    }
    console.log('[Test Teardown] Shutting down server...');
    await shutdown(); // Shutdown closes server and disconnects DB
    console.log('[Test Teardown] Server shut down.');
  }, 45000); // Increased timeout for teardown

  // --- Cleanup before each test ---
  beforeEach(async () => {
    await Post.deleteMany({});
    try {
        const stream = minioClient.listObjects(MINIO_BUCKET!, '', true);
        const objectsToRemove: string[] = [];
        for await (const obj of stream) {
            if (obj.name) { objectsToRemove.push(obj.name); }
        }
        if (objectsToRemove.length > 0) {
            await minioClient.removeObjects(MINIO_BUCKET!, objectsToRemove);
            // console.log(`[Test Cleanup] Removed ${objectsToRemove.length} objects from Minio.`);
        }
    } catch (error: any) { /* ... error handling ... */ }
  });

  // --- Test Cases --- 

  it('GET / should return an empty array initially', async () => {
    const response = await request(app).get('/api/posts');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('POST / should create a new post with an image', async () => {
    const description = 'This is a test post description';
    const imagePath = path.resolve(__dirname, '../seed-images/avatar.jpeg');
    expect(fs.existsSync(imagePath)).toBe(true);

    const response = await request(app)
      .post('/api/posts')
      .set('Accept', 'application/json')
      .field('authorID', testUserId.toString())
      .field('description', description)
      .attach('imagePath', imagePath);

    // Now expect 201 because internal axios call should work
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('_id');
    expect(response.body.authorID).toBe(testUserId.toString());
    expect(response.body.description).toBe(description);
    expect(response.body).toHaveProperty('imagePath');
    expect(response.body.imagePath).toContain(MINIO_BUCKET);

    // Verify DB
    const postInDb = await Post.findById(response.body._id);
    expect(postInDb).not.toBeNull();
    expect(postInDb?.imagePath).toBe(response.body.imagePath);

    // Verify User
    const updatedUser = await User.findById(testUserId);
    expect(updatedUser?.authoredPostIDs).toContainEqual(postInDb?._id);

    // Verify Minio
    try {
        const objectName = response.body.imagePath.substring(response.body.imagePath.indexOf(MINIO_BUCKET!) + MINIO_BUCKET!.length + 1);
        const stat = await minioClient.statObject(MINIO_BUCKET!, objectName);
        expect(stat).toBeDefined();
    } catch(err) { fail(`Failed to find uploaded object in Minio: ${err}`); }
  });

  it('POST / should return 400 if authorID is missing', async () => {
      const imagePath = path.resolve(__dirname, '../seed-images/avatar.jpeg'); // Path relative to /app/tests
      expect(fs.existsSync(imagePath)).toBe(true);

      const response = await request(app)
        .post('/api/posts')
        .set('Accept', 'application/json')
        .field('description', 'Missing author')
        .attach('imagePath', imagePath);

      // Now expect 400 because internal axios call should work, but validation fails
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Post validation failed: authorID: Path `authorID` is required.');
   });

  it('POST / should return 400 if imagePath file is missing', async () => {
        const response = await request(app)
            .post('/api/posts')
            .set('Accept', 'application/json')
            .field('authorID', testUserId.toString())
            .field('description', 'Missing image file');

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Post validation failed: imagePath: Path `imagePath` is required.');
    });

  it('GET / should return posts after creation', async () => {
       const description = 'Another test post';
       const imagePath = path.resolve(__dirname, '../seed-images/bonsai.jpeg');
       expect(fs.existsSync(imagePath)).toBe(true);

       const createResponse = await request(app)
            .post('/api/posts')
            .field('authorID', testUserId.toString())
            .field('description', description)
            .attach('imagePath', imagePath);

       // Now expect 201 because internal axios call should work
       expect(createResponse.status).toBe(201);

       const response = await request(app).get('/api/posts');
       expect(response.status).toBe(200);
       expect(response.body).toBeInstanceOf(Array);
       expect(response.body.length).toBe(1);
   });

});