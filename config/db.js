import mongoose from "mongoose";
import "dotenv/config";

// Initialize connection variables
let connectionRetries = 0;
const MAX_RETRIES = 3;

export const connectDB = async () => {
  // Verify the correct environment variable exists
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined");
  }

  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    console.log('Using existing MongoDB connection');
    return mongoose.connection;
  }

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true
    // Removed deprecated options:
    // useNewUrlParser: true,    // No longer needed in Mongoose 6+
    // useUnifiedTopology: true  // No longer needed in Mongoose 6+
  };

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Event listeners
    mongoose.connection.on("connected", () => {
      console.log("🟢 MongoDB connected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("🔴 MongoDB error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🟠 MongoDB disconnected");
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      await mongoose.disconnect();
      console.log("🟢 MongoDB connection closed gracefully");
      process.exit(0);
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

    return conn;
  } catch (err) {
    connectionRetries++;
    
    if (connectionRetries < MAX_RETRIES) {
      console.log(`Retrying connection (${connectionRetries}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return connectDB();
    }

    console.error("❌ MongoDB connection failed after retries:", err.message);
    throw err;
  }
};

export const checkDbHealth = () => ({
  status: mongoose.connection?.readyState === 1 ? "healthy" : "unhealthy",
  dbName: mongoose.connection?.name || "disconnected",
  ping: mongoose.connection?.readyState === 1 ? "ok" : "failed"
});