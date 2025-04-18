// back-end/tests/users.test.ts

import request from 'supertest';
import mongoose from 'mongoose';
import app, { startServer, shutdown } from '../src/server.js'; // Import start/shutdown
import User, { IUser } from '../src/models/User.js'; // Import User model and IUser type
import { MONGO_URI } from '../src/config/config.js'; // Import config for DB connection

describe('Users API (/api/users)', () => {
  let testUser1Data: Partial<IUser>;
  let testUser2Data: Partial<IUser>;
  let createdUser1: IUser;
  let createdUser2: IUser;

  // --- Setup: Start server, connect DB ---
  beforeAll(async () => {
    console.log('[Test Users Setup] Starting server...');
    await startServer();
    console.log('[Test Users Setup] Server started.');
  }, 45000); // Increased timeout for server start

  // --- Teardown: Stop server, disconnect DB ---
  afterAll(async () => {
    console.log('[Test Users Teardown] Shutting down server...');
    await shutdown();
    console.log('[Test Users Teardown] Server shut down.');
  }, 45000); // Increased timeout for teardown

  // --- Cleanup/Setup before each test ---
  beforeEach(async () => {
    // Clean the users collection
    await User.deleteMany({});

    // Define unique user data for each test run to avoid conflicts between tests
    testUser1Data = {
      googleId: `test-google-${Date.now()}-1`,
      username: `testuser_${Date.now()}_1`,
      profilePicPath: 'http://example.com/pic1.jpg',
      bio: 'Bio for user 1'
    };
    testUser2Data = {
        googleId: `test-google-${Date.now()}-2`,
        username: `testuser_${Date.now()}_2`,
        profilePicPath: 'http://example.com/pic2.jpg',
        bio: 'Bio for user 2'
    };
    // Clear potentially created users from previous tests within the same describe block if needed
    // createdUser1 = undefined; // Not strictly needed as beforeEach reruns
    // createdUser2 = undefined;
  });

  // == GET /api/users ==
  describe('GET /api/users', () => {
    it('should return an empty array when no users exist', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all users when users exist', async () => {
      // Arrange: Create users directly in the DB for this test
      await User.create(testUser1Data);
      await User.create(testUser2Data);

      // Act
      const response = await request(app).get('/api/users');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      // Check if the response contains objects matching the created users (flexible order)
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ username: testUser1Data.username }),
          expect.objectContaining({ username: testUser2Data.username })
        ])
      );
    });
  });

  // == GET /api/users/:id ==
  describe('GET /api/users/:id', () => {
    beforeEach(async () => {
        // Ensure at least one user exists for GET by ID tests
        createdUser1 = await User.create(testUser1Data);
    });

    it('should return a specific user when given a valid ID', async () => {
      const response = await request(app).get(`/api/users/${createdUser1._id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', createdUser1._id.toString());
      expect(response.body).toHaveProperty('username', testUser1Data.username);
      expect(response.body).toHaveProperty('googleId', testUser1Data.googleId);
    });

    it('should return 404 if user ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/users/${nonExistentId}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should return 400 if user ID format is invalid', async () => {
      const invalidId = 'invalid-id-format';
      const response = await request(app).get(`/api/users/${invalidId}`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid user ID format');
    });
  });

  // == POST /api/users ==
  describe('POST /api/users', () => {
    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(testUser1Data);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('googleId', testUser1Data.googleId);
      expect(response.body).toHaveProperty('username', testUser1Data.username);
      expect(response.body).toHaveProperty('profilePicPath', testUser1Data.profilePicPath);
      expect(response.body).toHaveProperty('bio', testUser1Data.bio);
      expect(response.body.authoredPostIDs).toEqual([]); // Check default empty arrays
      expect(response.body.likedPostIDs).toEqual([]);
      expect(response.body.followingUserIDs).toEqual([]);

      // Verify in DB
      const userInDb = await User.findById(response.body._id);
      expect(userInDb).not.toBeNull();
      expect(userInDb?.username).toBe(testUser1Data.username);
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteData = { googleId: 'only-google' }; // Missing username, profilePicPath
      const response = await request(app)
        .post('/api/users')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required user fields');
    });

    it('should return 409 if googleId is duplicated', async () => {
        await User.create(testUser1Data); // Create the first user

        const duplicateGoogleIdData = {
            ...testUser2Data, // Use other unique data
            googleId: testUser1Data.googleId // Reuse googleId
        };

        const response = await request(app)
            .post('/api/users')
            .send(duplicateGoogleIdData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('googleId must be unique');
    });

     it('should return 409 if username is duplicated', async () => {
        await User.create(testUser1Data); // Create the first user

        const duplicateUsernameData = {
            ...testUser2Data, // Use other unique data
            username: testUser1Data.username // Reuse username
        };

        const response = await request(app)
            .post('/api/users')
            .send(duplicateUsernameData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('username must be unique');
     });
  });

  // == PUT /api/users/:id ==
  describe('PUT /api/users/:id', () => {
    beforeEach(async () => {
        // Ensure user exists before each PUT test
        createdUser1 = await User.create(testUser1Data);
    });

    it('should update allowed fields (bio, username, profilePicPath)', async () => {
        const updatePayload = {
            username: `updated_${testUser1Data.username}`,
            profilePicPath: 'http://example.com/newpic.jpg',
            bio: 'Updated Bio!'
        };
        const response = await request(app)
            .put(`/api/users/${createdUser1._id}`)
            .send(updatePayload);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('_id', createdUser1._id.toString());
        expect(response.body.username).toBe(updatePayload.username);
        expect(response.body.profilePicPath).toBe(updatePayload.profilePicPath);
        expect(response.body.bio).toBe(updatePayload.bio);
        expect(response.body.googleId).toBe(testUser1Data.googleId); // Should not change

        // Verify in DB
        const userInDb = await User.findById(createdUser1._id);
        expect(userInDb?.username).toBe(updatePayload.username);
        expect(userInDb?.bio).toBe(updatePayload.bio);
    });

    it('should not update immutable fields like googleId', async () => {
        const updatePayload = {
            bio: 'Attempting googleId update',
            googleId: 'new-google-id-should-be-ignored'
        };
        const response = await request(app)
            .put(`/api/users/${createdUser1._id}`)
            .send(updatePayload);

        expect(response.status).toBe(200);
        expect(response.body.bio).toBe(updatePayload.bio);
        expect(response.body.googleId).toBe(testUser1Data.googleId); // Check it remained unchanged

        // Verify in DB
        const userInDb = await User.findById(createdUser1._id);
        expect(userInDb?.googleId).toBe(testUser1Data.googleId);
    });

    it('should return 404 if user ID does not exist for update', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .put(`/api/users/${nonExistentId}`)
            .send({ bio: 'Update for non-existent user' });
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('User not found for update');
    });

    it('should return 400 if user ID format is invalid for update', async () => {
        const invalidId = 'invalid-id-format';
        const response = await request(app)
            .put(`/api/users/${invalidId}`)
            .send({ bio: 'Update for invalid ID user' });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid user ID format');
    });

     it('should return 409 if username update conflicts with another user', async () => {
        createdUser2 = await User.create(testUser2Data); // Create a second user

        const conflictUpdate = { username: testUser2Data.username }; // Try to use user2's username

        const response = await request(app)
            .put(`/api/users/${createdUser1._id}`) // Update user1
            .send(conflictUpdate);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('username must be unique');
     });
  });

  // == PATCH /api/users/:id/follow ==
  describe('PATCH /api/users/:id/follow', () => {
      beforeEach(async () => {
          // Ensure both users exist before each follow test
          createdUser1 = await User.create(testUser1Data);
          createdUser2 = await User.create(testUser2Data);
      });

      it('should allow user1 to follow user2', async () => {
          const response = await request(app)
              .patch(`/api/users/${createdUser1._id}/follow`)
              .send({ userIdToFollow: createdUser2._id.toString() });

          expect(response.status).toBe(200);
          expect(response.body._id).toBe(createdUser1._id.toString());
          expect(response.body.followingUserIDs).toBeInstanceOf(Array);
          expect(response.body.followingUserIDs).toContain(createdUser2._id.toString());

          // Verify in DB
          const user1InDb = await User.findById(createdUser1._id);
          expect(user1InDb?.followingUserIDs).toContainEqual(createdUser2._id);
      });

      it('should not add duplicate user to following list ($addToSet)', async () => {
          // Follow once
          await request(app)
              .patch(`/api/users/${createdUser1._id}/follow`)
              .send({ userIdToFollow: createdUser2._id.toString() });

          // Follow again
          const response = await request(app)
              .patch(`/api/users/${createdUser1._id}/follow`)
              .send({ userIdToFollow: createdUser2._id.toString() });

          expect(response.status).toBe(200);
          // Check length hasn't increased
          expect(response.body.followingUserIDs.length).toBe(1);
          expect(response.body.followingUserIDs).toContain(createdUser2._id.toString());

          // Verify in DB
          const user1InDb = await User.findById(createdUser1._id);
          expect(user1InDb?.followingUserIDs.length).toBe(1);
      });

       it('should return 404 if the user performing the follow does not exist', async () => {
           const nonExistentId = new mongoose.Types.ObjectId();
           const response = await request(app)
               .patch(`/api/users/${nonExistentId}/follow`)
               .send({ userIdToFollow: createdUser2._id.toString() });
           expect(response.status).toBe(404);
           expect(response.body.error).toBe('User not found');
       });

        // Your route currently doesn't check if the user *being followed* exists.
        // This test reflects that current behavior.
        it('should return 200 even if the user being followed does not exist', async () => {
           const nonExistentFollowId = new mongoose.Types.ObjectId();
           const response = await request(app)
               .patch(`/api/users/${createdUser1._id}/follow`)
               .send({ userIdToFollow: nonExistentFollowId.toString() });

           expect(response.status).toBe(200);
           expect(response.body.followingUserIDs).toContain(nonExistentFollowId.toString());

           // Verify in DB that the non-existent ID was added
           const user1InDb = await User.findById(createdUser1._id);
           expect(user1InDb?.followingUserIDs).toContainEqual(nonExistentFollowId);
       });

        it('should return 400 if follower ID format is invalid', async () => {
           const invalidId = 'invalid-id-format';
           const response = await request(app)
               .patch(`/api/users/${invalidId}/follow`)
               .send({ userIdToFollow: createdUser2._id.toString() });
           expect(response.status).toBe(400);
           expect(response.body.error).toBe('Invalid user ID format');
       });

       it('should return 400 if followed ID format is invalid', async () => {
           const invalidFollowId = 'invalid-id-format';
           const response = await request(app)
               .patch(`/api/users/${createdUser1._id}/follow`)
               .send({ userIdToFollow: invalidFollowId });
           expect(response.status).toBe(400);
           expect(response.body.error).toBe('Invalid user ID format');
       });

       it('should return 400 if userIdToFollow is missing in body', async () => {
            const response = await request(app)
               .patch(`/api/users/${createdUser1._id}/follow`)
               .send({}); // Missing userIdToFollow

           // Your route doesn't explicitly check req.body.userIdToFollow before validation
           // Mongoose `isValid` check will fail for `undefined` when coerced.
           expect(response.status).toBe(400);
           expect(response.body.error).toBe('Invalid user ID format');
       });
  });

}); // End of main describe block