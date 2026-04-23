// Save this as test-connection.js in your backend folder
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  console.log(" Testing MongoDB Atlas connection...");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("MONGO_URL exists:", !!process.env.MONGO_URL);

  if (process.env.MONGO_URL) {
    console.log("Connection string format check:");
    console.log(
      "- Starts with mongodb+srv:",
      process.env.MONGO_URL.startsWith("mongodb+srv:"),
    );
    console.log(
      "- Contains cluster name:",
      process.env.MONGO_URL.includes("3ry2ma6.mongodb.net"),
    );
    console.log(
      "- First 60 characters:",
      process.env.MONGO_URL.substring(0, 60) + "...",
    );
  }

  try {
    console.log("\n⏳ Attempting connection...");

    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log("✅ SUCCESS: MongoDB connected!");
    console.log("Connection state:", mongoose.connection.readyState);
    console.log("Database name:", mongoose.connection.name);

    await mongoose.disconnect();
    console.log(" Disconnected successfully");
  } catch (error) {
    console.error(" CONNECTION FAILED:");
    console.error("Error message:", error.message);

    if (error.message.includes("IP")) {
      console.error("\n IP WHITELIST ISSUE DETECTED!");
      console.error("1. Go to MongoDB Atlas Dashboard");
      console.error('2. Click "Network Access"');
      console.error('3. Click "Add IP Address"');
      console.error("4. Add 0.0.0.0/0 for development");
      console.error("5. Wait 1-2 minutes for changes to apply");
    }
  }

  process.exit(0);
}

testConnection();

