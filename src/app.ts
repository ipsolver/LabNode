import express from 'express';
import mongoose from 'mongoose';
import carRouter from './routes/car';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req, res) => {
  const state = mongoose.connection.readyState;

  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isConnected = state === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'error',
    database: states[state] ?? 'unknown',
  });
});

app.use('/auth', authRouter);
app.use('/api/cars', carRouter);
app.use(errorHandler);

export default app;