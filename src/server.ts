import app from './app';
import { connectDB } from './config/database';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

async function start() { 
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully');

    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        console.error('Error while closing MongoDB connection:', error);
        process.exit(1);
      }
    });
  });
}

start();