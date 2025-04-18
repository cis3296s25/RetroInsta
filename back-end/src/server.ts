import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http'; // Import http to type the 'server' variable if needed

// Import configuration
import { SERVER_PORT, SERVER_HOST, API_BASE_PATHS } from './config/config.js'; // Use index.js

// Import database functions - Assuming seed.js is now in database/
import { connectDB, disconnectDB } from './database/database.js';
import { initializeData } from './database/seed.js'; // Correct path

// Import routers
import authRouter from './routes/auth.js';
import postsRouter from './routes/posts.js';
import usersRouter from './routes/users.js';
import commentsRouter from './routes/comments.js';
import uploadRouter from './routes/upload.js';

const app: Express = express();

// --- Core Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Request Logging Middleware ---
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API Routes ---
app.use(API_BASE_PATHS.AUTH, authRouter);
app.use(API_BASE_PATHS.POSTS, postsRouter);
app.use(API_BASE_PATHS.USERS, usersRouter);
app.use(API_BASE_PATHS.COMMENTS, commentsRouter);
app.use('/', uploadRouter);

// --- Not Found Handler ---
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: `Not Found - ${req.method} ${req.originalUrl}` });
});

// --- Global Error Handler ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err.stack || err);
  const statusCode = (err as any).status || 500;
  res.status(statusCode).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// --- Start Server Function ---
let server: http.Server | undefined;

export const startServer = async () => {
  try {
    await connectDB();

    // Always start listening
    server = app.listen(SERVER_PORT, () => {
      console.log(`Server running on http://${SERVER_HOST}:${SERVER_PORT}`);

      const shouldSeed = process.env.SEED_DB === 'true' ||
                         (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');

      if (shouldSeed) {
        console.log("🌱 Seeding conditions met. Starting data initialization...");
        initializeData().catch(seedError => { // Call async IIFE immediately
          console.error("Error during data initialization:", seedError);
        });
      } else {
        console.log("Skipping data initialization based on environment settings.");
      }
    });

    server.on('error', (error) => {
        console.error('Server startup error:', error);
        process.exit(1);
    });

    // --- Signal handling ---
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server?.close(async () => {
          console.log('HTTP server closed.');
          await disconnectDB(); // Disconnect DB after server closes
          console.log('MongoDB disconnected.');
          process.exit(0);
        });
        // Add timeout for forceful shutdown if needed
        setTimeout(() => {
          console.error('Graceful shutdown timed out. Forcefully exiting.');
          process.exit(1);
        }, 10000); // e.g., 10 seconds timeout
      });
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

export const shutdown = async () => {
  console.log('Attempting graceful shutdown...');
  await new Promise<void>(async (resolve, reject) => {
    if (server) {
      server.close(async (err) => {
        if (err) {
          console.error('Error closing HTTP server:', err);
          return reject(err);
        }
        console.log('HTTP server closed.');
        await disconnectDB(); // Disconnect DB after server closes
        resolve();
      });
    } else {
      await disconnectDB(); // Disconnect DB if server wasn't started
      resolve();
    }
  });
  console.log('Shutdown complete.');
};

// Call startServer only if this file is run directly (e.g., `node dist/server.js`)
// This prevents auto-starting when imported (like by Supertest).
// Docker compose `run` will execute the default CMD, which *will* run this.
if (import.meta.url === `file://${process.argv[1]}`) { // Check if run directly
  console.log("Server file executed directly. Starting server...");
  startServer();
} else {
  console.log("Server file imported. Skipping automatic server start.");
}


export default app // for testing