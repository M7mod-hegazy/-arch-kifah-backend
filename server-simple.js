import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ultra-simple CORS that definitely works
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow specific origins
  if (origin === 'https://arch-kifah.vercel.app' || 
      origin === 'http://localhost:8080' || 
      origin === 'http://localhost:8081' ||
      !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Arch Kifah Backend API - Simple Version',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    routes: [
      'GET /',
      'GET /api/health',
      'GET /api/projects',
      'POST /api/projects'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Simple projects endpoint for testing
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Test Project',
        description: 'This is a test project',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ],
    message: 'Projects retrieved successfully'
  });
});

// Create project endpoint
app.post('/api/projects', (req, res) => {
  const projectData = req.body;
  
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      ...projectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    message: 'Project created successfully'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
});

export default app;
