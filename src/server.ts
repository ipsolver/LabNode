import app from './app';
import { connectDB } from './config/database';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully');

      server.close(async () => {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
            process.exit(0);
        } catch(error) {
          console.error('Error while closing MongoDB connection:', error);
          process.exit(1);
        }
      });
    });
  } catch(error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

start();