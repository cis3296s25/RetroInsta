console.log(">>> [App Runner] Debug starting...");

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http'; // Import http to type the 'server' variable if needed

// Import configuration
import { SERVER_PORT, SERVER_HOST, API_BASE_PATHS } from './config/config.js'; // Use index.js

// Import database functions - Assuming seed.js is now in database/
import { connectDB } from './database/database.js';
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
const startServer = async () => {
  let server: http.Server | undefined;
  try {
    await connectDB();

    server = app.listen(SERVER_PORT, () => {
      console.log(`Server running on http://${SERVER_HOST}:${SERVER_PORT}`);

      if (process.env.NODE_ENV !== 'production' || process.env.SEED_DB === 'true') {
        console.log("🌱 Seeding conditions met. Starting data initialization...");
        (async () => {
          try {
            await initializeData();
            console.log("Data initialization finished successfully.");
          } catch (seedError) {
            console.error("Error during data initialization:", seedError);
          }
        })();
      } else {
        console.log("Skipping data initialization based on environment settings.");
      }
    });

    server.on('error', (error) => {
        console.error('Server startup error:', error);
        process.exit(1);
    });

    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        // Implement your shutdown logic here, e.g., close server, disconnect DB
        server?.close(async () => { // Use server variable
          console.log('HTTP server closed.');
          // await disconnectDB(); // Call disconnectDB if you have it
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

startServer();