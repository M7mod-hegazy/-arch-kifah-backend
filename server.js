import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage for projects (will reset on server restart)
let projects = [
  {
    id: '1',
    title: 'مشروع تجريبي',
    description: 'هذا مشروع تجريبي للاختبار',
    status: 'waiting',
    totalCost: 50000,
    originalCost: 45000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    customer: {
      name: 'عميل تجريبي',
      phone: '01234567890',
      address: 'عنوان تجريبي'
    },
    subgoals: [],
    images: [],
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user',
    updatedBy: 'test-user'
  }
];

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

// Body parsing with error handling - increased limit for images
app.use(express.json({
  limit: '10mb', // Increased for image uploads
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Invalid JSON received:', e.message);
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format'
      });
      return;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      'GET /api/projects/:id',
      'POST /api/projects',
      'PUT /api/projects/:id',
      'DELETE /api/projects/:id'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    projectsCount: projects.length
  });
});

// Test endpoint for debugging
app.post('/api/test', (req, res) => {
  console.log('Test endpoint called with body:', req.body);
  res.json({
    success: true,
    message: 'Test endpoint working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Get all projects
app.get('/api/projects', (req, res) => {
  console.log(`GET /api/projects - Returning ${projects.length} projects`);
  res.json({
    success: true,
    data: projects,
    message: 'Projects retrieved successfully'
  });
});

// Get single project by ID
app.get('/api/projects/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`GET /api/projects/${projectId} - Getting single project`);

    const project = projects.find(p => p.id === projectId);

    if (!project) {
      console.log(`Project ${projectId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    console.log(`Project ${projectId} found and returned`);
    res.json({
      success: true,
      data: project,
      message: 'Project retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project',
      error: error.message
    });
  }
});

// Create project endpoint with timeout handling
app.post('/api/projects', (req, res) => {
  // Set longer timeout for image uploads
  req.setTimeout(30000); // 30 seconds
  try {
    const projectData = req.body;
    const requestSize = JSON.stringify(projectData).length;
    console.log('POST /api/projects - Request size:', requestSize, 'bytes');
    console.log('POST /api/projects - Project title:', projectData.title);
    console.log('POST /api/projects - Images count:', projectData.images?.length || 0);

    // Validate required fields
    if (!projectData.title || !projectData.customer) {
      console.error('Missing required fields:', { title: projectData.title, customer: projectData.customer });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title and customer are required'
      });
    }

    // Handle images safely
    let processedImages = [];
    if (Array.isArray(projectData.images)) {
      processedImages = projectData.images.map((img, index) => {
        // Ensure each image has required fields
        return {
          id: img.id || `img_${Date.now()}_${index}`,
          url: img.url || '',
          thumbnail: img.thumbnail || img.url || '',
          filename: img.filename || `image_${index + 1}`,
          size: img.size || 0,
          uploadedAt: img.uploadedAt || new Date().toISOString(),
          uploadedBy: img.uploadedBy || 'current-user'
        };
      });
    }

    console.log(`Processing ${processedImages.length} images for new project`);

    // Create new project with safe defaults
    const newProject = {
      id: Date.now().toString(),
      title: projectData.title || 'مشروع جديد',
      description: projectData.description || '',
      status: projectData.status || 'waiting',
      totalCost: Number(projectData.totalCost) || 0,
      originalCost: Number(projectData.originalCost) || Number(projectData.totalCost) || 0,
      startDate: projectData.startDate || new Date().toISOString(),
      endDate: projectData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customer: {
        name: projectData.customer?.name || 'عميل جديد',
        phone: projectData.customer?.phone || '',
        address: projectData.customer?.address || ''
      },
      subgoals: Array.isArray(projectData.subgoals) ? projectData.subgoals : [],
      images: processedImages,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: projectData.createdBy || 'مستخدم النظام',
      updatedBy: projectData.updatedBy || 'مستخدم النظام'
    };

    console.log('Created project object:', {
      id: newProject.id,
      title: newProject.title,
      totalCost: newProject.totalCost,
      customer: newProject.customer.name
    });

    // Add to in-memory storage
    projects.push(newProject);

    console.log(`Project created successfully. Total projects: ${projects.length}`);

    res.json({
      success: true,
      data: newProject,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update project endpoint
app.put('/api/projects/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    console.log(`PUT /api/projects/${projectId} - Updating project`);
    console.log('Updates received:', JSON.stringify(updates, null, 2));

    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      console.log(`Project ${projectId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const originalProject = projects[projectIndex];
    console.log('Original project before update:', {
      id: originalProject.id,
      title: originalProject.title,
      totalCost: originalProject.totalCost,
      subgoalsCount: originalProject.subgoals?.length || 0,
      imagesCount: originalProject.images?.length || 0
    });

    // Update the project with proper merging
    projects[projectIndex] = {
      ...originalProject,
      ...updates,
      // Ensure arrays are properly handled
      subgoals: updates.subgoals || originalProject.subgoals || [],
      images: updates.images || originalProject.images || [],
      history: updates.history || originalProject.history || [],
      updatedAt: new Date().toISOString()
    };

    const updatedProject = projects[projectIndex];
    console.log('Updated project after merge:', {
      id: updatedProject.id,
      title: updatedProject.title,
      totalCost: updatedProject.totalCost,
      subgoalsCount: updatedProject.subgoals?.length || 0,
      imagesCount: updatedProject.images?.length || 0
    });

    console.log(`Project ${projectId} updated successfully`);

    res.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
});

// Delete project endpoint
app.delete('/api/projects/:id', (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`DELETE /api/projects/${projectId} - Deleting project`);

    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Remove the project
    projects.splice(projectIndex, 1);

    console.log(`Project ${projectId} deleted successfully. Remaining: ${projects.length}`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
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
