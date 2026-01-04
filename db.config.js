import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 20000, // wait for Atlas primary
    });

    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // ❌ DO NOT exit the process on Render
  }
};
