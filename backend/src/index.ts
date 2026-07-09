import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "http://13.203.203.175:3000",
    "http://localhost:3000"
  ],
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chanakya Cloud Workspace Backend is online.' });
});

app.listen(port as number, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`🚀 Chanakya Cloud Workspace Backend Running`);
  console.log(`🔊 Listening on port: http://localhost:${port}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================================`);
});
