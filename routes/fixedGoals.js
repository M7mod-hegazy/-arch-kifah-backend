const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://m7mod:275757@cluster0.lht612f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'arch_kifah';
const COLLECTION_NAME = 'fixed_goals';

let db;

// Initialize MongoDB connection
MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB for Fixed Goals');
    db = client.db(DB_NAME);
  })
  .catch(error => {
    console.error('Failed to connect to MongoDB:', error);
  });

// Helper function to ensure database connection
const ensureConnection = async () => {
  if (!db) {
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db(DB_NAME);
  }
  return db;
};

// GET /api/fixed-goals - Get all fixed goals (shared globally)
router.get('/', async (req, res) => {
  try {
    const database = await ensureConnection();
    const collection = database.collection(COLLECTION_NAME);
    
    const fixedGoals = await collection.find({}).sort({ createdAt: -1 }).toArray();
    
    // Convert MongoDB _id to id for frontend compatibility
    const formattedGoals = fixedGoals.map(goal => ({
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description,
      status: goal.status || 'waiting',
      isFixed: goal.isFixed !== false, // Default to true
      familyId: goal.familyId || null,
      order: goal.order || 0,
      timerDuration: goal.timerDuration || 0,
      timerUnit: goal.timerUnit || 'minutes',
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
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      status = 'waiting',
      isFixed = true,
      familyId = null,
      order = 0,
      timerDuration = 0,
      timerUnit = 'minutes'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required'
      });
    }

    const database = await ensureConnection();
    const collection = database.collection(COLLECTION_NAME);

    const newGoal = {
      title: title.trim(),
      description: description?.trim() || '',
      status,
      isFixed,
      familyId,
      order,
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

// PUT /api/fixed-goals/:id - Update a fixed goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, isFixed, familyId, order, timerDuration, timerUnit } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal ID'
      });
    }
    
    const database = await ensureConnection();
    const collection = database.collection(COLLECTION_NAME);
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (isFixed !== undefined) updateData.isFixed = isFixed;
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal ID'
      });
    }
    
    const database = await ensureConnection();
    const collection = database.collection(COLLECTION_NAME);
    
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

// PUT /api/fixed-goals/reorder - Reorder fixed goals
router.put('/reorder', async (req, res) => {
  try {
    const { goals } = req.body;

    if (!goals || !Array.isArray(goals)) {
      return res.status(400).json({
        success: false,
        message: 'Goals array is required'
      });
    }

    console.log('Reordering goals:', goals.length, 'goals');

    const database = await ensureConnection();
    const collection = database.collection(COLLECTION_NAME);

    // Update each goal's order
    const updatePromises = goals.map(async (goal) => {
      if (!goal.id || goal.order === undefined) {
        throw new Error(`Invalid goal data: ${JSON.stringify(goal)}`);
      }

      if (!ObjectId.isValid(goal.id)) {
        throw new Error(`Invalid goal ID: ${goal.id}`);
      }

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

    if (successCount !== goals.length) {
      console.warn(`Only ${successCount}/${goals.length} goals were updated`);
    }

    res.json({
      success: true,
      message: `Successfully reordered ${successCount} fixed goals`,
      updated: successCount,
      total: goals.length
    });
  } catch (error) {
    console.error('Error reordering fixed goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder fixed goals',
      error: error.message
    });
  }
});

module.exports = router;
