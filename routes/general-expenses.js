// Backend API Route: /api/general-expenses
// This file should be added to the backend server

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://m7mod:275757@cluster0.lht612f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'arch-kifah';

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

// GET /api/general-expenses - Get all general expenses
router.get('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
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
router.post('/', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
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
router.put('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
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

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'General expense not found'
      });
    }

    // Format response
    const formattedExpense = {
      ...result.value,
      id: result.value._id.toString(),
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
router.delete('/:id', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
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

module.exports = router;
