import express from 'express';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Get database instance from app
let db;
router.use((req, res, next) => {
  db = req.app.locals.db;
  next();
});

// Get all active timers
router.get('/active', async (req, res) => {
  try {
    console.log('📊 Getting all active timers...');
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

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

// Get timers for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log(`📊 Getting timers for project: ${projectId}`);
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

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

// Start a new timer
router.post('/', async (req, res) => {
  try {
    const { projectId, goalId, goalTitle, startTime, duration, isActive } = req.body;
    
    console.log('⏱️ Starting new timer:', { projectId, goalId, goalTitle, duration });
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

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

// Update timer duration (for extending timers)
router.put('/:projectId/:goalId', async (req, res) => {
  try {
    const { projectId, goalId } = req.params;
    const { duration } = req.body;
    
    console.log(`⏱️ Updating timer duration for ${projectId}/${goalId} to ${duration} seconds`);

    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Debug: Check what timers exist for this project/goal
    const existingTimers = await db.collection('timers').find({ projectId, goalId }).toArray();
    console.log('🔍 Existing timers for this goal:', existingTimers.map(t => ({
      goalId: t.goalId,
      isActive: t.isActive,
      duration: t.duration,
      startTime: t.startTime
    })));

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
      // Generate possible alternative goalId formats
      const alternativeGoalIds = [];

      if (goalId.startsWith('fixed_')) {
        // Convert fixed_goalId to fixed-goalId-* format
        const baseId = goalId.replace('fixed_', '');
        // Look for any goalId that starts with fixed-baseId-
        const regexPattern = `^fixed-${baseId}-`;

        result = await db.collection('timers').findOneAndUpdate(
          {
            projectId,
            goalId: { $regex: regexPattern },
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
      }
    }

    // Check if timer was found and updated
    if (!result || !result.value) {
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

    console.log('✅ Timer duration updated successfully:', result.value);

    res.json({
      success: true,
      data: result.value
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

// Stop a specific timer
router.delete('/:projectId/:goalId', async (req, res) => {
  try {
    const { projectId, goalId } = req.params;
    
    console.log(`⏹️ Stopping timer for ${projectId}/${goalId}`);
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

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

// Stop all timers for a project
router.delete('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log(`⏹️ Stopping all timers for project: ${projectId}`);
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

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

export default router;
