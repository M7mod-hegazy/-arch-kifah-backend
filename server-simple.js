import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://m7mod:275757@cluster0.lht612f.mongodb.net/arch_kifah?retryWrites=true&w=majority&appName=Cluster0';
let db;
let client;
let mongoConnected = false;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('🔗 MongoDB URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(); // Use database from URI
    console.log('✅ Connected to MongoDB successfully');

    // Test the connection
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');

    mongoConnected = true;
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('❌ Full error:', error);
    mongoConnected = false;
    return false;
  }
}

// Initialize MongoDB connection
connectToMongoDB().catch(err => {
  console.error('❌ Failed to initialize MongoDB connection:', err);
});

// MongoDB collections will be used instead of in-memory storage
console.log('Backend initialized with MongoDB integration');

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
app.get('/api/health', async (req, res) => {
  try {
    let projectsCount = 0;
    if (db) {
      projectsCount = await db.collection('projects').countDocuments();
    }

    res.json({
      status: 'OK',
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      database: db ? 'Connected' : 'Disconnected',
      projectsCount: projectsCount
    });
  } catch (error) {
    res.json({
      status: 'OK',
      message: 'API is healthy (database error)',
      timestamp: new Date().toISOString(),
      database: 'Error',
      projectsCount: 0,
      error: error.message
    });
  }
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

// Debug endpoint to check environment and MongoDB status
app.get('/api/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Debug endpoint',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_SET: !!process.env.MONGODB_URI,
      MONGODB_URI_LENGTH: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
      DB_CONNECTED: !!db,
      MONGO_CONNECTED: mongoConnected
    },
    timestamp: new Date().toISOString()
  });
});

// ===== AUTHENTICATION ENDPOINTS =====

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('POST /api/auth/register - Registering user:', email);

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة'
      });
    }

    // Check if MongoDB is connected
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'هذا البريد الإلكتروني مسجل بالفعل'
      });
    }

    // Create new user
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // In production, hash this!
      companyId: 'arch_kifah_company',
      role: 'user',
      createdAt: new Date().toISOString(),
      avatar: null
    };

    // Insert user into MongoDB
    const result = await db.collection('users').insertOne(newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = {
      ...newUser,
      id: result.insertedId.toString()
    };

    console.log('User registered successfully:', userWithoutPassword.email);

    res.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      data: {
        user: userWithoutPassword,
        token: `token_${result.insertedId}_${Date.now()}`
      }
    });

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحساب'
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('POST /api/auth/login - Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    // Check if MongoDB is connected
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      });
    }

    // Find user in MongoDB
    const user = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Check password (in production, use bcrypt)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = {
      ...user,
      id: user._id.toString()
    };

    console.log('User logged in successfully:', userWithoutPassword.email);

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: userWithoutPassword,
        token: `token_${user._id}_${Date.now()}`
      }
    });

  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
});

// Get all users (for debugging)
app.get('/api/auth/users', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    const users = await db.collection('users').find({}, {
      projection: { password: 0 } // Exclude password field
    }).toArray();

    const usersWithId = users.map(user => ({
      ...user,
      id: user._id.toString()
    }));

    res.json({
      success: true,
      data: usersWithId,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get all projects - SHARED ACROSS ALL USERS
app.get('/api/projects', async (req, res) => {
  try {
    console.log('GET /api/projects - Fetching shared projects from MongoDB');

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Get all projects from MongoDB (shared across all users)
    const projects = await db.collection('projects').find({}).toArray();

    // Format projects with proper ID field
    const formattedProjects = projects.map(project => ({
      ...project,
      id: project._id.toString(),
      subgoals: project.subgoals || [],
      images: project.images || [],
      history: project.history || [],
      companyId: project.companyId || 'arch_kifah_company'
    }));

    console.log(`Returning ${formattedProjects.length} shared projects`);

    res.json({
      success: true,
      data: formattedProjects,
      count: formattedProjects.length,
      message: 'Shared projects retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching projects from MongoDB:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`GET /api/projects/${projectId} - Getting single project from MongoDB`);

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Try to find by MongoDB ObjectId first, then by string ID
    let project;
    try {
      project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    } catch (e) {
      // If ObjectId fails, try string ID
      project = await db.collection('projects').findOne({ id: projectId });
    }

    if (!project) {
      console.log(`Project ${projectId} not found in MongoDB`);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Format project with proper ID
    const formattedProject = {
      ...project,
      id: project._id.toString(),
      subgoals: project.subgoals || [],
      images: project.images || [],
      history: project.history || []
    };

    console.log(`Project ${projectId} found in MongoDB`);
    res.json({
      success: true,
      data: formattedProject,
      message: 'Project retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching project from MongoDB:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
});

// Create project endpoint with timeout handling
app.post('/api/projects', async (req, res) => {
  // Set longer timeout for image uploads
  req.setTimeout(30000); // 30 seconds
  try {
    const projectData = req.body;
    const requestSize = JSON.stringify(projectData).length;
    console.log('POST /api/projects - Request size:', requestSize, 'bytes');
    console.log('POST /api/projects - Project title:', projectData.title);
    console.log('POST /api/projects - Images count:', projectData.images?.length || 0);

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

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

    // Save to MongoDB instead of in-memory storage
    const result = await db.collection('projects').insertOne(newProject);

    // Format response with MongoDB ID
    const savedProject = {
      ...newProject,
      id: result.insertedId.toString(),
      _id: result.insertedId
    };

    console.log(`Project saved to MongoDB successfully. ID: ${result.insertedId}`);

    res.json({
      success: true,
      data: savedProject,
      message: 'Project created and saved to database successfully'
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
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    console.log(`PUT /api/projects/${projectId} - Updating project in MongoDB`);
    console.log('Updates received:', JSON.stringify(updates, null, 2));

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Try to find and update by MongoDB ObjectId first, then by string ID
    let result;
    try {
      result = await db.collection('projects').findOneAndUpdate(
        { _id: new ObjectId(projectId) },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
    } catch (e) {
      // If ObjectId fails, try string ID
      result = await db.collection('projects').findOneAndUpdate(
        { id: projectId },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
    }

    if (!result.value) {
      console.log(`Project ${projectId} not found in MongoDB`);
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        debug: {
          requestedId: projectId,
        }
      });
    }

    // Format the updated project
    const updatedProject = {
      ...result.value,
      id: result.value._id.toString(),
      subgoals: result.value.subgoals || [],
      images: result.value.images || [],
      history: result.value.history || []
    };

    console.log('Updated project in MongoDB:', {
      id: updatedProject.id,
      title: updatedProject.title,
      totalCost: updatedProject.totalCost,
      subgoalsCount: updatedProject.subgoals?.length || 0,
      imagesCount: updatedProject.images?.length || 0
    });

    console.log(`Project ${projectId} updated successfully in MongoDB`);

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
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`DELETE /api/projects/${projectId} - Deleting project from MongoDB`);

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Try to delete by MongoDB ObjectId first, then by string ID
    let result;
    try {
      result = await db.collection('projects').deleteOne({ _id: new ObjectId(projectId) });
    } catch (e) {
      // If ObjectId fails, try string ID
      result = await db.collection('projects').deleteOne({ id: projectId });
    }

    if (result.deletedCount === 0) {
      console.log(`Project ${projectId} not found in MongoDB`);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    console.log(`Project ${projectId} deleted successfully from MongoDB`);

    res.json({
      success: true,
      message: 'Project deleted successfully from database'
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
