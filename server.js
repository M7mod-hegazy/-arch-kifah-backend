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

// Connect to MongoDB with retry logic
async function connectToMongoDB() {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      console.log(`🔄 Attempting to connect to MongoDB (attempt ${retryCount + 1}/${maxRetries})...`);
      console.log('🔗 MongoDB URI length:', MONGODB_URI.length);
      console.log('🔗 MongoDB URI preview:', MONGODB_URI.substring(0, 30) + '...');

      // Use the same options that work in the debug test
      const connectionOptions = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: 1,
        retryWrites: true,
        w: 'majority'
      };

      console.log('🔄 Using connection options:', JSON.stringify(connectionOptions));
      client = new MongoClient(MONGODB_URI, connectionOptions);

      await client.connect();
      console.log('✅ Client connected successfully');

      // Always use explicit database name
      console.log('🔄 Selecting database: arch-kifah');
      db = client.db('arch-kifah');
      console.log('🔄 Database selected successfully');

      // Test the connection with a simple operation
      await db.admin().ping();
      console.log('✅ MongoDB ping successful');

      // Test collection access
      const projectsCount = await db.collection('projects').countDocuments();
      console.log(`✅ Projects collection accessible, count: ${projectsCount}`);

      mongoConnected = true;
      return true;
    } catch (error) {
      retryCount++;
      console.error(`❌ MongoDB connection attempt ${retryCount} failed:`, error.message);

      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing client:', closeError.message);
        }
      }

      if (retryCount < maxRetries) {
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ All MongoDB connection attempts failed');
        mongoConnected = false;
        return false;
      }
    }
  }

  return false;
}

// Initialize MongoDB connection
connectToMongoDB().catch(err => {
  console.error('❌ Failed to initialize MongoDB connection:', err);
});

// Helper function to ensure database connection for each request
async function ensureDbConnection() {
  if (!db || !mongoConnected) {
    console.log('🔄 Database not connected, attempting to connect...');
    const success = await connectToMongoDB();
    if (!success) {
      throw new Error('Failed to establish database connection');
    }
  }
  return db;
}

// MongoDB collections will be used instead of in-memory storage
console.log('Backend initialized with MongoDB integration');

// Ultra-simple CORS that definitely works
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow specific origins
  if (origin === 'https://arch-kifah.vercel.app' ||
      origin === 'http://localhost:8080' ||
      origin === 'http://localhost:8081' ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000' ||
      !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Fallback: allow all origins for CORS issues
    res.header('Access-Control-Allow-Origin', '*');
  }

  // Additional CORS headers for all requests
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Body parsing with error handling - increased limit for large projects
app.use(express.json({
  limit: '50mb', // Increased for large projects with images
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
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root endpoint with connection retry
app.get('/', async (req, res) => {
  try {
    let databaseStatus = 'Disconnected';

    try {
      // Ensure database connection
      await ensureDbConnection();
      databaseStatus = 'Connected';
    } catch (error) {
      console.error('Database connection error in root endpoint:', error);
      databaseStatus = 'Disconnected';
    }

    res.json({
      status: 'OK',
      message: 'Arch Kifah Backend API with MongoDB & Auth',
      timestamp: new Date().toISOString(),
      cors: 'enabled',
      database: databaseStatus,
      routes: [
        'GET /',
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/users',
        'GET /api/projects',
        'GET /api/projects/:id',
        'POST /api/projects',
        'PUT /api/projects/:id',
        'DELETE /api/projects/:id',
        'GET /api/fixed-goals',
        'POST /api/fixed-goals',
        'DELETE /api/fixed-goals/:id',
        'GET /api/notifications',
        'POST /api/notifications',
        'PUT /api/notifications/:id/read',
        'PUT /api/notifications/mark-all-read',
        'DELETE /api/notifications'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Root endpoint error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    let projectsCount = 0;
    let databaseStatus = 'Disconnected';

    try {
      // Ensure database connection
      const database = await ensureDbConnection();
      projectsCount = await database.collection('projects').countDocuments();
      databaseStatus = 'Connected';
    } catch (error) {
      console.error('Database connection error in health check:', error);
      databaseStatus = 'Disconnected';
    }

    res.json({
      status: 'OK',
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
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
app.get('/api/debug', async (req, res) => {
  try {
    // Try a fresh connection test
    let testConnection = false;
    let testError = null;
    let mainConnectionError = null;

    if (process.env.MONGODB_URI) {
      try {
        console.log('🔄 Testing fresh MongoDB connection...');
        // Use the already imported MongoClient
        const testClient = new MongoClient(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000
        });

        await testClient.connect();
        await testClient.db('arch-kifah').admin().ping();
        testConnection = true;
        await testClient.close();
        console.log('✅ Fresh connection test successful');
      } catch (error) {
        testError = error.message;
        console.error('❌ Fresh connection test failed:', error.message);
      }

      // Try to reconnect the main connection if it's not working
      if (!mongoConnected) {
        try {
          console.log('🔄 Attempting to reconnect main MongoDB connection...');
          await connectToMongoDB();
        } catch (error) {
          mainConnectionError = error.message;
          console.error('❌ Main connection retry failed:', error.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Debug endpoint',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI_SET: !!process.env.MONGODB_URI,
        MONGODB_URI_LENGTH: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        MONGODB_URI_PREVIEW: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 50) + '...' : 'Not set',
        DB_CONNECTED: !!db,
        MONGO_CONNECTED: mongoConnected,
        FRESH_CONNECTION_TEST: testConnection,
        TEST_ERROR: testError,
        MAIN_CONNECTION_RETRY_ERROR: mainConnectionError
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug endpoint error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

    // Ensure database connection
    const database = await ensureDbConnection();

    // Get all projects from MongoDB (shared across all users)
    const projects = await database.collection('projects').find({}).toArray();

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
  // Set longer timeout for large updates
  req.setTimeout(60000); // 60 seconds

  try {
    const projectId = req.params.id;
    const updates = req.body;
    const requestSize = JSON.stringify(updates).length;
    console.log(`PUT /api/projects/${projectId} - Updating project in MongoDB`);
    console.log('Request size:', requestSize, 'bytes');

    // Check if request is too large for Vercel (2MB limit for better performance)
    if (requestSize > 2 * 1024 * 1024) { // 2MB threshold
      return res.status(413).json({
        success: false,
        message: 'حجم الطلب كبير جداً. يرجى تقليل حجم الصور أو إزالة بعضها. الحد الأقصى المسموح: 2 ميجابايت',
        requestSize: requestSize,
        maxSize: '2MB',
        arabicMessage: 'حجم الطلب كبير جداً. يرجى تقليل حجم الصور أو إزالة بعضها.'
      });
    }

    console.log('Updates received keys:', Object.keys(updates));

    // Ensure database connection
    const database = await ensureDbConnection();

    // Try to find and update by MongoDB ObjectId first, then by string ID
    let result;
    let searchMethod = '';

    try {
      // First try with ObjectId
      console.log(`Trying to update project with ObjectId: ${projectId}`);
      result = await database.collection('projects').findOneAndUpdate(
        { _id: new ObjectId(projectId) },
        { $set: { ...updates, updatedAt: new Date().toISOString() } },
        { returnDocument: 'after' }
      );
      searchMethod = 'ObjectId';
    } catch (e) {
      console.log(`ObjectId failed, trying string ID: ${e.message}`);
      // If ObjectId fails, try string ID
      try {
        result = await database.collection('projects').findOneAndUpdate(
          { id: projectId },
          { $set: { ...updates, updatedAt: new Date().toISOString() } },
          { returnDocument: 'after' }
        );
        searchMethod = 'string id';
      } catch (e2) {
        // Try _id as string
        result = await database.collection('projects').findOneAndUpdate(
          { _id: projectId },
          { $set: { ...updates, updatedAt: new Date().toISOString() } },
          { returnDocument: 'after' }
        );
        searchMethod = 'string _id';
      }
    }

    console.log(`Search method used: ${searchMethod}`);
    console.log(`Result:`, result ? 'Found' : 'Not found');
    console.log(`Result structure:`, JSON.stringify(result, null, 2));

    // Check both result.value (older driver) and result (newer driver)
    const updatedDoc = result?.value || result;

    if (!updatedDoc) {
      console.log(`Project ${projectId} not found in MongoDB using any method`);
      return res.status(404).json({
        success: false,
        message: 'Project not found',
        debug: {
          requestedId: projectId,
          searchMethod: searchMethod,
          resultStructure: result ? Object.keys(result) : 'null'
        }
      });
    }

    // Format the updated project
    const updatedProject = {
      ...updatedDoc,
      id: updatedDoc._id.toString(),
      subgoals: updatedDoc.subgoals || [],
      images: updatedDoc.images || [],
      history: updatedDoc.history || []
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

// ===== FIXED GOALS API ENDPOINTS =====

// GET /api/fixed-goals - Get all fixed goals (shared globally)
app.get('/api/fixed-goals', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    const fixedGoals = await collection.find({}).sort({ createdAt: -1 }).toArray();

    // Convert MongoDB _id to id for frontend compatibility
    const formattedGoals = fixedGoals.map(goal => ({
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description || '',
      status: goal.status || 'waiting',
      isFixed: goal.isFixed !== false,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    }));

    res.json({
      success: true,
      data: formattedGoals,
      count: formattedGoals.length
    });
  } catch (error) {
    console.error('Error fetching fixed goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fixed goals',
      error: error.message
    });
  }
});

// POST /api/fixed-goals - Create a new fixed goal
app.post('/api/fixed-goals', async (req, res) => {
  try {
    const { title, description, status = 'waiting', isFixed = true } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    const newGoal = {
      title: title.trim(),
      description: description?.trim() || '',
      status,
      isFixed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newGoal);

    const createdGoal = {
      id: result.insertedId.toString(),
      ...newGoal
    };

    res.status(201).json({
      success: true,
      data: createdGoal,
      message: 'Fixed goal created successfully'
    });
  } catch (error) {
    console.error('Error creating fixed goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create fixed goal',
      error: error.message
    });
  }
});

// DELETE /api/fixed-goals/:id - Delete a fixed goal
app.delete('/api/fixed-goals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal ID'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fixed goal not found'
      });
    }

    res.json({
      success: true,
      message: 'Fixed goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fixed goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete fixed goal',
      error: error.message
    });
  }
});

// ===== NOTIFICATIONS API ENDPOINTS =====

// GET /api/notifications - Get all notifications (shared globally, latest 10)
app.get('/api/notifications', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('notifications');

    const notifications = await collection.find({}).sort({ createdAt: -1 }).limit(10).toArray();

    // Convert MongoDB _id to id for frontend compatibility
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message || '',
      projectId: notification.projectId,
      userId: notification.userId,
      userName: notification.userName,
      date: notification.date,
      read: notification.read || false,
      details: notification.details,
      redirectTo: notification.redirectTo,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    }));

    res.json({
      success: true,
      data: formattedNotifications,
      count: formattedNotifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// POST /api/notifications - Create a new notification
app.post('/api/notifications', async (req, res) => {
  try {
    const { type, title, message, projectId, userId, userName, details, redirectTo } = req.body;

    if (!type || !title || !userId || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, userId, and userName are required'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('notifications');

    const newNotification = {
      type,
      title,
      message: message || '',
      projectId,
      userId,
      userName,
      date: new Date().toISOString(),
      read: false,
      details,
      redirectTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newNotification);

    // Keep only latest 10 notifications - cleanup old ones
    const totalCount = await collection.countDocuments();
    if (totalCount > 10) {
      const oldNotifications = await collection.find({}).sort({ createdAt: 1 }).limit(totalCount - 10).toArray();
      const oldIds = oldNotifications.map(n => n._id);
      await collection.deleteMany({ _id: { $in: oldIds } });
    }

    const createdNotification = {
      id: result.insertedId.toString(),
      ...newNotification
    };

    res.status(201).json({
      success: true,
      data: createdNotification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('notifications');

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          read: true,
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read
app.put('/api/notifications/mark-all-read', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('notifications');

    const result = await collection.updateMany(
      { read: { $ne: true } },
      {
        $set: {
          read: true,
          updatedAt: new Date().toISOString()
        }
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// DELETE /api/notifications - Clear all notifications
app.delete('/api/notifications', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('notifications');

    const result = await collection.deleteMany({});

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} notifications`
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications',
      error: error.message
    });
  }
});

// 404 handler - must be after all routes
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
