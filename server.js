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
  limit: '50mb' // Increased for large projects with images
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// JSON error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('Invalid JSON received:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format'
    });
  }
  next();
});

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
        'PUT /api/fixed-goals/:id',
        'PUT /api/fixed-goals/reorder',
        'DELETE /api/fixed-goals/:id',
        'GET /api/notifications',
        'POST /api/notifications',
        'PUT /api/notifications/:id/read',
        'PUT /api/notifications/mark-all-read',
        'DELETE /api/notifications',
        'GET /api/project-families',
        'POST /api/project-families',
        'PUT /api/project-families/:id',
        'DELETE /api/project-families/:id',
        'POST /api/project-families/migrate-projects',
        'GET /api/general-expenses',
        'POST /api/general-expenses',
        'PUT /api/general-expenses/:id',
        'DELETE /api/general-expenses/:id',
        'GET /api/general-revenues',
        'POST /api/general-revenues',
        'PUT /api/general-revenues/:id',
        'DELETE /api/general-revenues/:id',
        'GET /api/drawings',
        'POST /api/drawings',
        'PUT /api/drawings/:id',
        'DELETE /api/drawings/:id'
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
    const { name, email, mobile, password } = req.body;

    console.log('POST /api/auth/register - Registering user:', email, 'Mobile:', mobile);

    // Validate input
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والبريد الإلكتروني ورقم الجوال وكلمة المرور مطلوبة'
      });
    }

    // Validate mobile number format (Egyptian mobile numbers)
    const mobileRegex = /^(010|011|012|015)[0-9]{8}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال غير صحيح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويكون 11 رقم'
      });
    }

    // Check if MongoDB is connected
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      });
    }

    // Check if user already exists (by email or mobile)
    const existingUser = await db.collection('users').findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { mobile: mobile.trim() }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: 'هذا البريد الإلكتروني مسجل بالفعل'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'رقم الجوال مسجل بالفعل'
        });
      }
    }

    // Create new user
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
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







// Update user profile
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, mobile } = req.body;

    console.log('PUT /api/users/:userId - Updating user:', userId);
    console.log('Request body:', { name, email, mobile });

    // Validate ObjectId format
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم غير صحيح'
      });
    }

    // Validate input
    if (!name || !email || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والبريد الإلكتروني ورقم الجوال مطلوبة'
      });
    }

    // Validate mobile number format
    const mobileRegex = /^(010|011|012|015)[0-9]{8}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الجوال غير صحيح'
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      });
    }

    // Check if email or mobile already exists for other users
    const existingUser = await db.collection('users').findOne({
      _id: { $ne: new ObjectId(userId) },
      $or: [
        { email: email.toLowerCase().trim() },
        { mobile: mobile.trim() }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: 'هذا البريد الإلكتروني مستخدم من قبل مستخدم آخر'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'رقم الجوال مستخدم من قبل مستخدم آخر'
        });
      }
    }

    // Update user
    const updateResult = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(userId) },
      {
        $set: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          mobile: mobile.trim(),
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Return updated user (without password)
    const { password, ...userWithoutPassword } = updateResult;

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: {
        ...userWithoutPassword,
        id: userWithoutPassword._id
      }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث الملف الشخصي'
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

    // Get all families for lookup
    const families = await database.collection('project_families').find({}).toArray();
    const familiesMap = new Map(families.map(f => [f._id.toString(), f]));

    // Format projects with proper ID field and family information
    const formattedProjects = projects.map(project => {
      const family = project.familyId ? familiesMap.get(project.familyId) : null;

      return {
        ...project,
        id: project._id.toString(),
        familyId: project.familyId || null,
        family: family ? {
          id: family._id.toString(),
          name: family.name,
          description: family.description,
          isDefault: family.isDefault
        } : null,
        subgoals: project.subgoals || [],
        images: project.images || [],
        history: project.history || [],
        companyId: project.companyId || 'arch_kifah_company'
      };
    });

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
      totalGoalsCost: 0, // Initialize goals cost to 0
      familyId: projectData.familyId || null, // IMPORTANT: Include familyId
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

// Update subgoal cost endpoint
app.put('/api/projects/:id/subgoals/:subgoalId/cost', async (req, res) => {
  try {
    const { id: projectId, subgoalId } = req.params;
    const { goalCost, note } = req.body;

    console.log(`Updating subgoal cost for project ${projectId}, subgoal ${subgoalId}`);

    await ensureDbConnection();
    const collection = db.collection('projects');

    // First, get the current project to find the goal title and old cost
    const currentProject = await collection.findOne({ _id: new ObjectId(projectId) });
    if (!currentProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Find the specific subgoal to get its title and current cost
    const targetSubgoal = currentProject.subgoals?.find(sg => sg.id === subgoalId);
    if (!targetSubgoal) {
      return res.status(404).json({
        success: false,
        message: 'Subgoal not found'
      });
    }

    const oldCost = Number(targetSubgoal.goalCost) || 0;
    const newCost = Number(goalCost) || 0;
    const costDifference = newCost - oldCost;
    const goalTitle = targetSubgoal.title || 'هدف غير محدد';

    // Find the project and update the specific subgoal's cost
    const result = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(projectId),
        'subgoals.id': subgoalId
      },
      {
        $set: {
          'subgoals.$.goalCost': newCost,
          'subgoals.$.updatedAt': new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        $push: {
          history: {
            id: Date.now().toString(),
            type: 'goal_cost_updated',
            description: `تم تحديث تكلفة الهدف "${goalTitle}" من ${oldCost.toLocaleString('ar-EG')} إلى ${newCost.toLocaleString('ar-EG')} ج.م`,
            note: note || `زيادة تكلفة ${goalTitle}`,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString(),
            userId: 'current-user',
            userName: 'المستخدم الحالي',
            oldValue: oldCost,
            newValue: newCost
          }
        }
      },
      { returnDocument: 'after' }
    );

    const updatedDoc = result?.value || result;

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project or subgoal not found'
      });
    }

    // Calculate total goals cost
    const totalGoalsCost = (updatedDoc.subgoals || [])
      .reduce((sum, goal) => sum + (Number(goal.goalCost) || 0), 0);

    // Calculate new total cost (original cost + goals cost)
    const originalCost = Number(updatedDoc.originalCost) || Number(updatedDoc.totalCost) || 0;
    const newTotalCost = originalCost + totalGoalsCost;

    // Update the project with the new total goals cost and total cost
    const finalUpdate = await collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          totalGoalsCost: totalGoalsCost,
          totalCost: newTotalCost,
          updatedAt: new Date().toISOString()
        },
        $push: {
          history: {
            id: (Date.now() + 1).toString(),
            type: 'cost_updated',
            description: `تم تحديث التكلفة الإجمالية للمشروع إلى ${newTotalCost.toLocaleString('ar-EG')} ج.م (تكلفة الأهداف: ${totalGoalsCost.toLocaleString('ar-EG')} ج.م)`,
            note: `زيادة تكلفة ${goalTitle}`,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString(),
            userId: 'current-user',
            userName: 'المستخدم الحالي',
            oldValue: updatedDoc.totalCost || originalCost,
            newValue: newTotalCost
          }
        }
      },
      { returnDocument: 'after' }
    );

    const finalDoc = finalUpdate?.value || finalUpdate || updatedDoc;

    // Format the response
    const updatedProject = {
      ...finalDoc,
      id: finalDoc._id.toString(),
      totalGoalsCost: totalGoalsCost,
      totalCost: newTotalCost,
      subgoals: finalDoc.subgoals || [],
      images: finalDoc.images || [],
      history: finalDoc.history || []
    };

    // Create notification for cost change - DEACTIVATED
    // Notifications system is deactivated
    console.log('📝 Goal cost updated (notification deactivated):', goalTitle, newCost);

    console.log(`Subgoal cost updated successfully. Total goals cost: ${totalGoalsCost}`);

    res.json({
      success: true,
      data: updatedProject,
      message: 'تم تحديث تكلفة الهدف بنجاح',
      totalGoalsCost: totalGoalsCost
    });

  } catch (error) {
    console.error('Error updating subgoal cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subgoal cost',
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

// GET /api/fixed-goals - Get fixed goals (optionally filtered by family)
app.get('/api/fixed-goals', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    const { familyId } = req.query;

    // Build query - if familyId provided, filter by it, otherwise get all
    const query = familyId ? { familyId } : {};

    const fixedGoals = await collection.find(query).sort({
      familyId: 1,  // Group by family first
      order: 1,     // Then by order
      createdAt: 1  // Then by creation date
    }).toArray();

    // Convert MongoDB _id to id for frontend compatibility
    const formattedGoals = fixedGoals.map(goal => ({
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description || '',
      status: goal.status || 'waiting',
      isFixed: goal.isFixed !== false,
      familyId: goal.familyId || null,
      order: goal.order || 0,
      timerDuration: goal.timerDuration || 86400, // Default 1 day in seconds
      timerUnit: goal.timerUnit || 'seconds',
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
    const {
      title,
      description,
      status = 'waiting',
      isFixed = true,
      familyId,
      order,
      timerDuration = 86400, // Default 1 day in seconds
      timerUnit = 'seconds'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    // If order not provided, get the next order number for this family
    let goalOrder = order;
    if (goalOrder === undefined || goalOrder === null) {
      const lastGoal = await collection.findOne(
        { familyId: familyId || null },
        { sort: { order: -1 } }
      );
      goalOrder = (lastGoal?.order || 0) + 1;
    }

    const newGoal = {
      title: title.trim(),
      description: description?.trim() || '',
      status,
      isFixed,
      familyId: familyId || null,
      order: goalOrder,
      timerDuration,
      timerUnit,
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

// PUT /api/fixed-goals/reorder - Reorder fixed goals (MUST BE BEFORE /:id route)
app.put('/api/fixed-goals/reorder', async (req, res) => {
  try {
    console.log('🔄 REORDER ENDPOINT CALLED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { goals } = req.body; // Array of { id, order }

    if (!Array.isArray(goals)) {
      console.log('❌ Goals is not an array:', typeof goals);
      return res.status(400).json({
        success: false,
        message: 'Goals array is required'
      });
    }

    console.log(`📝 Processing ${goals.length} goals for reorder`);

    // Validate each goal
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      console.log(`Goal ${i + 1}: ID=${goal.id}, Order=${goal.order}`);

      if (!goal.id || goal.order === undefined) {
        console.log(`❌ Invalid goal data at index ${i}:`, goal);
        return res.status(400).json({
          success: false,
          message: `Invalid goal data at index ${i}: missing id or order`
        });
      }

      if (!ObjectId.isValid(goal.id)) {
        console.log(`❌ Invalid ObjectId at index ${i}: ${goal.id}`);
        return res.status(400).json({
          success: false,
          message: `Invalid goal ID at index ${i}: ${goal.id}`
        });
      }
    }

    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    // Update each goal's order
    const updatePromises = goals.map(async (goal) => {
      return collection.updateOne(
        { _id: new ObjectId(goal.id) },
        {
          $set: {
            order: goal.order,
            updatedAt: new Date().toISOString()
          }
        }
      );
    });

    const results = await Promise.all(updatePromises);

    // Check if all updates were successful
    const successCount = results.filter(result => result.matchedCount > 0).length;

    console.log(`✅ Successfully updated ${successCount}/${goals.length} goals`);

    res.json({
      success: true,
      message: `Successfully reordered ${successCount} fixed goals`,
      updated: successCount,
      total: goals.length
    });
  } catch (error) {
    console.error('❌ Error reordering fixed goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder fixed goals',
      error: error.message
    });
  }
});

// PUT /api/fixed-goals/reorder - Reorder fixed goals (MUST BE BEFORE /:id route)
app.put('/api/fixed-goals/reorder', async (req, res) => {
  try {
    console.log('🔄 REORDER ENDPOINT CALLED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { goals } = req.body; // Array of { id, order }

    if (!Array.isArray(goals)) {
      console.log('❌ Goals is not an array:', typeof goals);
      return res.status(400).json({
        success: false,
        message: 'Goals array is required'
      });
    }

    console.log(`📝 Processing ${goals.length} goals for reorder`);

    // Validate each goal
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      console.log(`Goal ${i + 1}: ID=${goal.id}, Order=${goal.order}`);

      if (!goal.id || goal.order === undefined) {
        console.log(`❌ Invalid goal data at index ${i}:`, goal);
        return res.status(400).json({
          success: false,
          message: `Invalid goal data at index ${i}: missing id or order`
        });
      }

      if (!ObjectId.isValid(goal.id)) {
        console.log(`❌ Invalid ObjectId at index ${i}: ${goal.id}`);
        return res.status(400).json({
          success: false,
          message: `Invalid goal ID at index ${i}: ${goal.id}`
        });
      }
    }

    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    // Update each goal's order
    const updatePromises = goals.map(async (goal) => {
      return collection.updateOne(
        { _id: new ObjectId(goal.id) },
        {
          $set: {
            order: goal.order,
            updatedAt: new Date().toISOString()
          }
        }
      );
    });

    const results = await Promise.all(updatePromises);

    // Check if all updates were successful
    const successCount = results.filter(result => result.matchedCount > 0).length;

    console.log(`✅ Successfully updated ${successCount}/${goals.length} goals`);

    res.json({
      success: true,
      message: `Successfully reordered ${successCount} fixed goals`,
      updated: successCount,
      total: goals.length
    });
  } catch (error) {
    console.error('❌ Error reordering fixed goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder fixed goals',
      error: error.message
    });
  }
});

// PUT /api/fixed-goals/:id - Update a fixed goal
app.put('/api/fixed-goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, familyId, order, timerDuration, timerUnit } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal ID'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('fixed_goals');

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (familyId !== undefined) updateData.familyId = familyId;
    if (order !== undefined) updateData.order = order;
    if (timerDuration !== undefined) updateData.timerDuration = timerDuration;
    if (timerUnit !== undefined) updateData.timerUnit = timerUnit;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fixed goal not found'
      });
    }

    // Fetch the updated goal
    const updatedGoal = await collection.findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      data: {
        id: updatedGoal._id.toString(),
        title: updatedGoal.title,
        description: updatedGoal.description,
        status: updatedGoal.status,
        isFixed: updatedGoal.isFixed,
        familyId: updatedGoal.familyId,
        order: updatedGoal.order,
        timerDuration: updatedGoal.timerDuration,
        timerUnit: updatedGoal.timerUnit,
        createdAt: updatedGoal.createdAt,
        updatedAt: updatedGoal.updatedAt
      },
      message: 'Fixed goal updated successfully'
    });
  } catch (error) {
    console.error('Error updating fixed goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update fixed goal',
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

// ===== PROJECT FAMILIES API ENDPOINTS =====

// GET /api/project-families - Get all project families
app.get('/api/project-families', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('project_families');

    let families = await collection.find({}).sort({ createdAt: 1 }).toArray();

    // Initialize default families if none exist
    if (families.length === 0) {
      console.log('No project families found, creating defaults...');

      const defaultFamilies = [
        {
          name: 'تراخيص',
          description: 'مشاريع التراخيص والموافقات',
          isDefault: true,
          theme: 'professional_blue',
          icon: '🏛️',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: 'استشارات',
          description: 'مشاريع الاستشارات الهندسية',
          isDefault: false,
          theme: 'creative_green',
          icon: '💼',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const result = await collection.insertMany(defaultFamilies);
      console.log('Created default families:', result.insertedIds);

      // Fetch the newly created families
      families = await collection.find({}).sort({ createdAt: 1 }).toArray();
    }

    // Convert MongoDB _id to id for frontend compatibility
    const formattedFamilies = families.map(family => ({
      id: family._id.toString(),
      name: family.name,
      description: family.description || '',
      isDefault: family.isDefault || false,
      theme: family.theme || 'professional_blue',
      icon: family.icon || '📁',
      createdAt: family.createdAt,
      updatedAt: family.updatedAt
    }));

    res.json({
      success: true,
      data: formattedFamilies,
      count: formattedFamilies.length
    });
  } catch (error) {
    console.error('Error fetching project families:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project families',
      error: error.message
    });
  }
});

// POST /api/project-families - Create a new project family
app.post('/api/project-families', async (req, res) => {
  try {
    const { name, description, isDefault = false, theme, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Family name is required'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('project_families');

    // If this is set as default, remove default from others
    if (isDefault) {
      await collection.updateMany(
        { isDefault: true },
        { $set: { isDefault: false, updatedAt: new Date().toISOString() } }
      );
    }

    const newFamily = {
      name: name.trim(),
      description: description?.trim() || '',
      isDefault,
      theme: theme || 'professional_blue', // Default theme
      icon: icon || '📁', // Default icon
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newFamily);

    const createdFamily = {
      id: result.insertedId.toString(),
      ...newFamily
    };

    res.status(201).json({
      success: true,
      data: createdFamily,
      message: 'Project family created successfully'
    });
  } catch (error) {
    console.error('Error creating project family:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project family',
      error: error.message
    });
  }
});

// PUT /api/project-families/:id - Update a project family
app.put('/api/project-families/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isDefault, theme, icon } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid family ID'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('project_families');

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (theme !== undefined) updateData.theme = theme;
    if (icon !== undefined) updateData.icon = icon;
    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;

      // If setting as default, remove default from others
      if (isDefault) {
        await collection.updateMany(
          { _id: { $ne: new ObjectId(id) }, isDefault: true },
          { $set: { isDefault: false, updatedAt: new Date().toISOString() } }
        );
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project family not found'
      });
    }

    // Fetch the updated family
    const updatedFamily = await collection.findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      data: {
        id: updatedFamily._id.toString(),
        name: updatedFamily.name,
        description: updatedFamily.description,
        isDefault: updatedFamily.isDefault,
        theme: updatedFamily.theme,
        icon: updatedFamily.icon,
        createdAt: updatedFamily.createdAt,
        updatedAt: updatedFamily.updatedAt
      },
      message: 'Project family updated successfully'
    });
  } catch (error) {
    console.error('Error updating project family:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project family',
      error: error.message
    });
  }
});

// DELETE /api/project-families/:id - Delete a project family
app.delete('/api/project-families/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid family ID'
      });
    }

    await ensureDbConnection();
    const collection = db.collection('project_families');

    // Check if this is the default family
    const family = await collection.findOne({ _id: new ObjectId(id) });
    if (family && family.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the default project family'
      });
    }

    // Check if any projects are using this family
    const projectsCollection = db.collection('projects');
    const projectsCount = await projectsCollection.countDocuments({ familyId: id });

    if (projectsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete family. ${projectsCount} projects are using this family.`
      });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project family not found'
      });
    }

    res.json({
      success: true,
      message: 'Project family deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project family:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project family',
      error: error.message
    });
  }
});

// POST /api/project-families/migrate-projects - Migrate existing projects to default family
app.post('/api/project-families/migrate-projects', async (req, res) => {
  try {
    await ensureDbConnection();
    const familiesCollection = db.collection('project_families');
    const projectsCollection = db.collection('projects');

    // Get the default family
    const defaultFamily = await familiesCollection.findOne({ isDefault: true });

    if (!defaultFamily) {
      return res.status(400).json({
        success: false,
        message: 'No default family found'
      });
    }

    // Update all projects that don't have a familyId
    const result = await projectsCollection.updateMany(
      { familyId: { $exists: false } },
      {
        $set: {
          familyId: defaultFamily._id.toString(),
          updatedAt: new Date().toISOString()
        }
      }
    );

    res.json({
      success: true,
      message: `Migrated ${result.modifiedCount} projects to default family`,
      modifiedCount: result.modifiedCount,
      defaultFamily: {
        id: defaultFamily._id.toString(),
        name: defaultFamily.name
      }
    });
  } catch (error) {
    console.error('Error migrating projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate projects',
      error: error.message
    });
  }
});

// ===== NOTIFICATIONS API ENDPOINTS - DEACTIVATED =====

// GET /api/notifications - DEACTIVATED
app.get('/api/notifications', async (req, res) => {
  // Notifications API deactivated - return empty array
  res.json({
    success: true,
    data: [],
    count: 0
  });
  return;

  /* DEACTIVATED CODE:
  try {
    await ensureDbConnection();
    const collection = db.collection('notifications');

    // Get limit from query parameter, default to 50, max 100
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const notifications = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();

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
  */
});

// POST /api/notifications - DEACTIVATED
app.post('/api/notifications', async (req, res) => {
  // Notifications API deactivated - return success without creating
  res.json({
    success: true,
    data: {
      id: 'deactivated',
      type: 'deactivated',
      title: 'Notifications Deactivated',
      message: '',
      read: false,
      date: new Date().toISOString()
    }
  });
  return;

  /* DEACTIVATED CODE:
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

    // Check for duplicate notifications (same type, projectId, and message within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const existingNotification = await collection.findOne({
      type,
      projectId,
      message: message || '',
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingNotification) {
      console.log('Duplicate notification prevented:', { type, projectId, message });
      // Return the existing notification instead of creating a duplicate
      return res.json({
        success: true,
        data: {
          id: existingNotification._id.toString(),
          type: existingNotification.type,
          title: existingNotification.title,
          message: existingNotification.message || '',
          projectId: existingNotification.projectId,
          userId: existingNotification.userId,
          userName: existingNotification.userName,
          details: existingNotification.details,
          redirectTo: existingNotification.redirectTo,
          read: existingNotification.read,
          date: existingNotification.createdAt,
          createdAt: existingNotification.createdAt,
          updatedAt: existingNotification.updatedAt
        }
      });
    }

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

    // Keep only latest 100 notifications - cleanup old ones
    const totalCount = await collection.countDocuments();
    if (totalCount > 100) {
      const oldNotifications = await collection.find({}).sort({ createdAt: 1 }).limit(totalCount - 100).toArray();
      const oldIds = oldNotifications.map(n => n._id);
      await collection.deleteMany({ _id: { $in: oldIds } });
      console.log(`Cleaned up ${oldIds.length} old notifications`);
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
  */
});

// PUT /api/notifications/:id/read - DEACTIVATED
app.put('/api/notifications/:id/read', async (req, res) => {
  // Notifications API deactivated
  res.json({ success: true, message: 'Notifications deactivated' });
  return;
  /* DEACTIVATED CODE:
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
  */
});

// PUT /api/notifications/mark-all-read - DEACTIVATED
app.put('/api/notifications/mark-all-read', async (req, res) => {
  res.json({ success: true, message: 'Notifications deactivated' });
});

// DELETE /api/notifications - DEACTIVATED
app.delete('/api/notifications', async (req, res) => {
  res.json({ success: true, message: 'Notifications deactivated' });
});

// ===== TIMER ROUTES =====

// GET /api/timers/active - Get all active timers
app.get('/api/timers/active', async (req, res) => {
  try {
    console.log('📊 Getting all active timers...');

    await ensureDbConnection();
    const timers = await db.collection('timers').find({ isActive: true }).toArray();

    console.log(`✅ Found ${timers.length} active timers`);

    res.json({
      success: true,
      data: timers
    });
  } catch (error) {
    console.error('❌ Error getting active timers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active timers',
      error: error.message
    });
  }
});

// GET /api/timers/project/:projectId - Get timers for a specific project
app.get('/api/timers/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log(`📊 Getting timers for project: ${projectId}`);

    await ensureDbConnection();
    const timers = await db.collection('timers').find({
      projectId: projectId,
      isActive: true
    }).toArray();

    console.log(`✅ Found ${timers.length} active timers for project ${projectId}`);

    res.json({
      success: true,
      data: timers
    });
  } catch (error) {
    console.error('❌ Error getting project timers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project timers',
      error: error.message
    });
  }
});

// POST /api/timers - Start a new timer
app.post('/api/timers', async (req, res) => {
  try {
    const { projectId, goalId, goalTitle, startTime, duration, isActive } = req.body;

    console.log('⏱️ Starting new timer:', { projectId, goalId, goalTitle, duration });

    await ensureDbConnection();

    // Validate required fields
    if (!projectId || !goalId || !goalTitle || !startTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, goalId, goalTitle, startTime, duration'
      });
    }

    // Stop any existing timer for this goal
    await db.collection('timers').updateMany(
      { projectId, goalId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Create new timer
    const newTimer = {
      projectId,
      goalId,
      goalTitle,
      startTime,
      duration,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('timers').insertOne(newTimer);

    console.log('✅ Timer started successfully:', result.insertedId);

    res.json({
      success: true,
      data: {
        id: result.insertedId,
        ...newTimer
      }
    });
  } catch (error) {
    console.error('❌ Error starting timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start timer',
      error: error.message
    });
  }
});

// PUT /api/timers/:projectId/:goalId - Update timer duration
app.put('/api/timers/:projectId/:goalId', async (req, res) => {
  try {
    const { projectId, goalId } = req.params;
    const { duration } = req.body;

    console.log(`⏱️ Updating timer duration for ${projectId}/${goalId} to ${duration} seconds`);

    await ensureDbConnection();

    if (!duration || typeof duration !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a number'
      });
    }

    // Try to find timer with exact goalId first, then try alternative formats
    let result = await db.collection('timers').findOneAndUpdate(
      { projectId, goalId, isActive: true },
      {
        $set: {
          duration: duration,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    // If not found with normalized goalId, try to find with original format
    if (!result || !result.value) {
      console.log(`🔍 Timer not found with goalId: ${goalId}, trying alternative formats...`);

      if (goalId.startsWith('fixed_')) {
        // Convert fixed_goalId to fixed-goalId-* format
        const baseId = goalId.replace('fixed_', '');

        console.log(`🔍 Looking for timers containing baseId: ${baseId}`);

        // Find all active timers for this project and check manually
        const activeTimers = await db.collection('timers').find({
          projectId,
          isActive: true
        }).toArray();

        console.log(`🔍 Found ${activeTimers.length} active timers for project`);

        // Look for a timer that matches the pattern
        const matchingTimer = activeTimers.find(timer =>
          timer.goalId.includes(baseId) || timer.goalId.startsWith(`fixed-${baseId}-`)
        );

        if (matchingTimer) {
          console.log(`✅ Found matching timer: ${matchingTimer.goalId}`);
          console.log(`🔄 Updating timer with _id: ${matchingTimer._id}`);

          result = await db.collection('timers').findOneAndUpdate(
            {
              _id: matchingTimer._id,
              isActive: true
            },
            {
              $set: {
                duration: duration,
                updatedAt: new Date()
              }
            },
            { returnDocument: 'after' }
          );

          console.log(`🔄 Update result:`, result);
          if (result) {
            console.log(`✅ Timer updated successfully! New duration: ${result.duration}`);
          } else {
            console.log(`❌ Update failed. Result:`, result);
          }
        }
      }
    }

    if (!result) {
      console.log('❌ No active timer found for:', { projectId, goalId });

      // Debug: Show what timers exist for this project
      const allTimers = await db.collection('timers').find({ projectId }).toArray();
      console.log('Available timers for project:', allTimers.map(t => ({
        goalId: t.goalId,
        isActive: t.isActive
      })));

      return res.status(404).json({
        success: false,
        message: 'Active timer not found for this goal'
      });
    }

    console.log('✅ Timer duration updated successfully');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error updating timer duration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update timer duration',
      error: error.message
    });
  }
});

// DELETE /api/timers/:projectId/:goalId - Stop a specific timer
app.delete('/api/timers/:projectId/:goalId', async (req, res) => {
  try {
    const { projectId, goalId } = req.params;

    console.log(`⏹️ Stopping timer for ${projectId}/${goalId}`);

    await ensureDbConnection();

    const result = await db.collection('timers').updateMany(
      { projectId, goalId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Stopped ${result.modifiedCount} timer(s) for goal ${goalId}`);

    res.json({
      success: true,
      message: `Stopped ${result.modifiedCount} timer(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error stopping timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop timer',
      error: error.message
    });
  }
});

// DELETE /api/timers/project/:projectId - Stop all timers for a project
app.delete('/api/timers/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log(`⏹️ Stopping all timers for project: ${projectId}`);

    await ensureDbConnection();

    const result = await db.collection('timers').updateMany(
      { projectId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Stopped ${result.modifiedCount} timer(s) for project ${projectId}`);

    res.json({
      success: true,
      message: `Stopped ${result.modifiedCount} timer(s) for project`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error stopping project timers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop project timers',
      error: error.message
    });
  }
});

// ===== GENERAL EXPENSES API ENDPOINTS =====

// GET /api/general-expenses - Get all general expenses
app.get('/api/general-expenses', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_expenses');

    const { start, end } = req.query;

    let query = {};
    if (start && end) {
      query = {
        date: {
          $gte: start,
          $lte: end
        }
      };
    }

    const expenses = await collection.find(query).sort({ createdAt: -1 }).toArray();

    // Convert MongoDB _id to id for frontend compatibility
    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      id: expense._id.toString(),
      _id: undefined
    }));

    res.status(200).json({
      success: true,
      data: formattedExpenses,
      count: formattedExpenses.length
    });
  } catch (error) {
    console.error('Error fetching general expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch general expenses',
      error: error.message
    });
  }
});

// POST /api/general-expenses - Create new general expense
app.post('/api/general-expenses', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_expenses');

    const expenseData = req.body;

    // Validate required fields
    if (!expenseData.amount || !expenseData.description || !expenseData.date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, description, date'
      });
    }

    const newExpense = {
      ...expenseData,
      amount: Number(expenseData.amount),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newExpense);

    // Return the created expense with id
    const createdExpense = {
      ...newExpense,
      id: result.insertedId.toString(),
      _id: undefined
    };

    res.status(201).json({
      success: true,
      data: createdExpense,
      message: 'General expense created successfully'
    });
  } catch (error) {
    console.error('Error creating general expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create general expense',
      error: error.message
    });
  }
});

// PUT /api/general-expenses/:id - Update general expense
app.put('/api/general-expenses/:id', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_expenses');

    const { id } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID'
      });
    }

    const updatedExpense = {
      ...updateData,
      amount: Number(updateData.amount),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedExpense },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'General expense not found'
      });
    }

    // Format response
    const formattedExpense = {
      ...result,
      id: result._id.toString(),
      _id: undefined
    };

    res.status(200).json({
      success: true,
      data: formattedExpense,
      message: 'General expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating general expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update general expense',
      error: error.message
    });
  }
});

// DELETE /api/general-expenses/:id - Delete general expense
app.delete('/api/general-expenses/:id', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_expenses');

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense ID'
      });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'General expense not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'General expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting general expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete general expense',
      error: error.message
    });
  }
});

// ===== GENERAL REVENUES API ENDPOINTS =====

// GET /api/general-revenues - Get all general revenues
app.get('/api/general-revenues', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_revenues');

    const { start, end, id } = req.query;

    let query = {};

    // Handle single revenue by ID
    if (id) {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid revenue ID'
        });
      }
      query = { _id: new ObjectId(id) };
    }

    // Handle date range filtering
    if (start && end) {
      query = {
        ...query,
        date: {
          $gte: start,
          $lte: end
        }
      };
    }

    const revenues = await collection.find(query).sort({ createdAt: -1 }).toArray();

    // Convert MongoDB _id to id for frontend compatibility
    const formattedRevenues = revenues.map(revenue => ({
      ...revenue,
      id: revenue._id.toString(),
      _id: undefined
    }));

    res.status(200).json({
      success: true,
      data: formattedRevenues,
      count: formattedRevenues.length
    });
  } catch (error) {
    console.error('Error fetching general revenues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch general revenues',
      error: error.message
    });
  }
});

// POST /api/general-revenues - Create new general revenue
app.post('/api/general-revenues', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_revenues');

    const revenueData = req.body;

    // Validate required fields
    if (!revenueData.amount || !revenueData.description || !revenueData.date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, description, date'
      });
    }

    const newRevenue = {
      ...revenueData,
      amount: Number(revenueData.amount),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newRevenue);

    // Return the created revenue with id
    const createdRevenue = {
      ...newRevenue,
      id: result.insertedId.toString(),
      _id: undefined
    };

    res.status(201).json({
      success: true,
      data: createdRevenue,
      message: 'General revenue created successfully'
    });
  } catch (error) {
    console.error('Error creating general revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create general revenue',
      error: error.message
    });
  }
});

// PUT /api/general-revenues/:id - Update general revenue
app.put('/api/general-revenues/:id', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_revenues');

    const { id } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid revenue ID'
      });
    }

    const updatedRevenue = {
      ...updateData,
      amount: Number(updateData.amount),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedRevenue },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'General revenue not found'
      });
    }

    // Format the response
    const formattedRevenue = {
      ...result.value,
      id: result.value._id.toString(),
      _id: undefined
    };

    res.status(200).json({
      success: true,
      data: formattedRevenue,
      message: 'General revenue updated successfully'
    });
  } catch (error) {
    console.error('Error updating general revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update general revenue',
      error: error.message
    });
  }
});

// DELETE /api/general-revenues/:id - Delete general revenue
app.delete('/api/general-revenues/:id', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('general_revenues');

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid revenue ID'
      });
    }

    const result = await collection.findOneAndDelete({
      _id: new ObjectId(id)
    });

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'General revenue not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'General revenue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting general revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete general revenue',
      error: error.message
    });
  }
});

// ===== DRAWINGS API ENDPOINTS =====

// GET /api/drawings - Get drawings for a project
app.get('/api/drawings', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('drawings');

    const { projectId } = req.query;

    let query = {};
    if (projectId) {
      query = { projectId: projectId };
    }

    const drawings = await collection.find(query).sort({ createdAt: -1 }).toArray();

    // Convert MongoDB _id to id for frontend compatibility
    const formattedDrawings = drawings.map(drawing => ({
      ...drawing,
      id: drawing._id.toString(),
      _id: undefined
    }));

    res.status(200).json({
      success: true,
      drawings: formattedDrawings,
      count: formattedDrawings.length
    });
  } catch (error) {
    console.error('Error fetching drawings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drawings',
      error: error.message
    });
  }
});

// POST /api/drawings - Create new drawing
app.post('/api/drawings', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('drawings');

    const drawingData = req.body;

    // Validate required fields
    if (!drawingData.projectId || !drawingData.title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, title'
      });
    }

    const newDrawing = {
      ...drawingData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newDrawing);

    // Return the created drawing with id
    const createdDrawing = {
      ...newDrawing,
      id: result.insertedId.toString(),
      _id: undefined
    };

    res.status(201).json({
      success: true,
      drawing: createdDrawing,
      message: 'Drawing created successfully'
    });
  } catch (error) {
    console.error('Error creating drawing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create drawing',
      error: error.message
    });
  }
});

// PUT /api/drawings/:id - Update drawing
app.put('/api/drawings/:id', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('drawings');

    const { id } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid drawing ID'
      });
    }

    const updatedDrawing = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedDrawing },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Drawing not found'
      });
    }

    // Format response
    const formattedDrawing = {
      ...result,
      id: result._id.toString(),
      _id: undefined
    };

    res.status(200).json({
      success: true,
      drawing: formattedDrawing,
      message: 'Drawing updated successfully'
    });
  } catch (error) {
    console.error('Error updating drawing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update drawing',
      error: error.message
    });
  }
});

// DELETE /api/drawings/:id - Delete drawing
app.delete('/api/drawings/:id', async (req, res) => {
  try {
    await ensureDbConnection();
    const collection = db.collection('drawings');

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid drawing ID'
      });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Drawing not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Drawing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting drawing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete drawing',
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
