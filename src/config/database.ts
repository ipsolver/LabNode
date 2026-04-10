import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
    if(!uri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

  await mongoose.connect(uri);
  console.log('MongoDB підключено');
}

mongoose.connection.on('error', (err) => {
  console.error('MongoDB помилка:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB відключено');
});