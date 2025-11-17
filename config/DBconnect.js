import mongoose from "mongoose";

export async function DBconnect() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    await mongoose.connect(uri);
    console.log("Api Database connected successfully");
  } catch (e) {
    console.error("Mongo connect error:", e.message);
    throw e; // Let the caller (startServer) decide whether to exit
  }
}