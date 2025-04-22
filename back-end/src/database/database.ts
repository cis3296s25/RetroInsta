import mongoose from 'mongoose';
import { MONGO_URI, POSTS_COLLECTION, USERS_COLLECTION } from '../config/config.js';

export const connectDB = async (): Promise<void> => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the configuration.");
    }
    await mongoose.connect(MONGO_URI);
    console.log("Successfully connected to MongoDB.");

    // Set up Mongoose connection event listeners
    mongoose.connection.on("error", (error: Error) => {
      console.error("Mongoose connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected.");
    });

  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // Exit if cannot connect
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed successfully.');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};
