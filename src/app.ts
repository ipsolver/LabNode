import express from 'express';
import carRouter from './routes/car';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());

app.use('/api/cars', carRouter);
app.use(errorHandler);

export default app;