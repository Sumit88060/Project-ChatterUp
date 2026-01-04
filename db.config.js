import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Successfully connected to database");
  } catch (err) {
    console.error("Failed to connect to database", err);
    process.exit(1); // stop app if DB fails
  }
};
