import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // Allow all origins for simplicity in development and testing
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chanakya Cloud Workspace Backend is online.' });
});

app.listen(port, () => {
  console.log(`=================================================`);
  console.log(`🚀 Chanakya Cloud Workspace Backend Running`);
  console.log(`🔊 Listening on port: http://localhost:${port}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================================`);
});
