import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://m7mod:275757@cluster0.lht612f.mongodb.net/arch_kifah?retryWrites=true&w=majority&appName=Cluster0';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 1,
    retryWrites: true,
    w: 'majority'
  });

  await client.connect();
  const db = client.db('arch-kifah');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      // Handle different GET endpoints
      const { query } = req;
      
      if (query.active !== undefined) {
        // GET /api/timers?active=true - Get all active timers
        console.log('📊 Getting all active timers...');
        const timers = await db.collection('timers').find({ isActive: true }).toArray();
        
        return res.status(200).json({
          success: true,
          data: timers
        });
      }
      
      if (query.projectId) {
        // GET /api/timers?projectId=xxx - Get timers for specific project
        console.log(`📊 Getting timers for project: ${query.projectId}`);
        const timers = await db.collection('timers').find({ 
          projectId: query.projectId 
        }).toArray();
        
        return res.status(200).json({
          success: true,
          data: timers
        });
      }

      // Default: get all timers
      const timers = await db.collection('timers').find({}).toArray();
      return res.status(200).json({
        success: true,
        data: timers
      });

    } else if (req.method === 'POST') {
      // POST /api/timers - Start a new timer
      const { projectId, goalId, goalTitle, startTime, duration, isActive } = req.body;

      console.log('⏱️ Starting new timer:', { projectId, goalId, goalTitle, duration });

      if (!projectId || !goalId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID and Goal ID are required'
        });
      }

      const timer = {
        projectId,
        goalId,
        goalTitle: goalTitle || 'Unnamed Goal',
        startTime: startTime || new Date(),
        duration: duration || 0,
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('timers').insertOne(timer);
      
      return res.status(201).json({
        success: true,
        data: { ...timer, _id: result.insertedId }
      });

    } else if (req.method === 'PUT') {
      // PUT /api/timers - Update timer
      const { projectId, goalId, duration } = req.body;

      if (!projectId || !goalId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID and Goal ID are required'
        });
      }

      const result = await db.collection('timers').updateOne(
        { projectId, goalId },
        { 
          $set: { 
            duration: duration || 0,
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({
        success: true,
        data: { modified: result.modifiedCount }
      });

    } else if (req.method === 'DELETE') {
      // DELETE /api/timers - Stop timer
      const { projectId, goalId } = req.body;

      if (!projectId || !goalId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID and Goal ID are required'
        });
      }

      const result = await db.collection('timers').updateOne(
        { projectId, goalId },
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({
        success: true,
        data: { modified: result.modifiedCount }
      });

    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Timer API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
