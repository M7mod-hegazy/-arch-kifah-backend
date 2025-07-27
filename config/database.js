import { MongoClient } from 'mongodb';

let client;
let db;

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'arch-kifah';

    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Create MongoDB client with increased timeouts
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 120000, // 2 minutes
      connectTimeoutMS: 30000, // 30 seconds
      maxIdleTimeMS: 300000, // 5 minutes
      retryWrites: true,
      retryReads: true,
    });

    // Connect to MongoDB
    await client.connect();
    
    // Test the connection
    await client.db(dbName).admin().ping();
    
    // Set the database
    db = client.db(dbName);
    
    console.log(`Connected to MongoDB database: ${dbName}`);
    
    // Create indexes for better performance
    await createIndexes();
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

export const closeDB = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Create database indexes for better performance
const createIndexes = async () => {
  try {
    const db = getDB();
    
    // Projects collection indexes
    await db.collection('projects').createIndex({ createdAt: -1 });
    await db.collection('projects').createIndex({ status: 1 });
    await db.collection('projects').createIndex({ 'customer.name': 'text', title: 'text' });
    await db.collection('projects').createIndex({ createdBy: 1 });
    
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Gracefully shutting down...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Gracefully shutting down...');
  await closeDB();
  process.exit(0);
});
