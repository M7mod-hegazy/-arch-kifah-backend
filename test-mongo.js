import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://m7mod:275757@cluster0.lht612f.mongodb.net/arch-kifah?retryWrites=true&w=majority&appName=Cluster0';

async function testMongoDB() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db(); // Use database from URI
    await db.admin().ping();
    
    console.log('✅ MongoDB ping successful');
    
    // Test collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));
    
    // Test users collection
    const usersCount = await db.collection('users').countDocuments();
    console.log('👥 Users count:', usersCount);
    
    // Test projects collection
    const projectsCount = await db.collection('projects').countDocuments();
    console.log('📋 Projects count:', projectsCount);
    
    await client.close();
    console.log('✅ MongoDB test completed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
  }
}

testMongoDB();
