import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';

// Load env variables
dotenv.config();

// Initialize DB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Import Routes
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';

// Setup Port
const PORT = process.env.PORT || 5000;

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/project', projectRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
