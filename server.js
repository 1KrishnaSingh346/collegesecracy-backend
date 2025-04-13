import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from "./config/db.js";

dotenv.config({ path: './config.env' });

const PORT = process.env.PORT || 5000;


await connectDB();
const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});