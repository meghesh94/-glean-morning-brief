import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './db/connection';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Run migrations on startup (idempotent - safe to run multiple times)
async function runMigrations() {
  try {
    // Check if users table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('Database tables already exist, skipping migration');
      return;
    }
    
    // Run migration
    console.log('Running database migrations...');
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✅ Database migration completed successfully');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    // Don't exit - let server start anyway (might be a connection issue)
  }
}

// Migration endpoint (for manual trigger)
app.post('/api/migrate', async (req: any, res: any) => {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    res.json({ success: true, message: 'Migration completed' });
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
import authRoutes from './routes/auth';
import integrationRoutes from './routes/integrations';
import briefRoutes from './routes/brief';
import memoryRoutes from './routes/memory';
import scratchpadRoutes from './routes/scratchpad';
import conversationRoutes from './routes/conversation';
app.use('/api/auth', authRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/brief', briefRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/scratchpad', scratchpadRoutes);
app.use('/api/conversation', conversationRoutes);

const PORT = process.env.PORT || 3001;

// Start server after migrations
runMigrations().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { app, io };

