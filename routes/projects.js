import express from 'express';
import { ProjectService } from '../services/ProjectService.js';
import { ImageService } from '../services/ImageService.js';
import multer from 'multer';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    try {
      ImageService.validateImageFile(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  }
});

// GET /api/projects - Get all projects with simplified response
router.get('/', async (req, res) => {
  try {
    const { page, limit, status, search, sortBy, sortOrder } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      status,
      search,
      sortBy: sortBy || 'updatedAt',
      sortOrder: parseInt(sortOrder) || -1
    };

    const projects = await ProjectService.getAll(options);

    res.json({
      success: true,
      data: projects,
      count: projects.length,
      pagination: {
        page: options.page,
        limit: options.limit
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/projects/:id - Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectService.getById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const project = await ProjectService.create(req.body);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Updating project:', id, 'with data:', Object.keys(req.body));

    const project = await ProjectService.update(id, req.body);

    console.log('Project updated successfully, returning:', {
      id: project.id,
      totalCost: project.totalCost,
      subgoalsCount: project.subgoals?.length,
      imagesCount: project.images?.length
    });

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);

    if (error.message === 'Invalid project ID') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await ProjectService.delete(id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);

    if (error.message === 'Invalid project ID' || error.message === 'Project not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/projects/:id/images - Upload images to project
router.post('/:id/images', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { uploadedBy = 'unknown' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    // Validate files
    ImageService.validateImageFiles(req.files);

    // Upload images
    const uploadedImages = await ProjectService.addImages(id, req.files, uploadedBy);

    res.json({
      success: true,
      data: uploadedImages,
      message: `${uploadedImages.length} images uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading images:', error);

    if (error.message.includes('Invalid') || error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/projects/:id/images/:imageId - Remove image from project
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    const { id, imageId } = req.params;

    await ProjectService.removeImage(id, imageId);

    res.json({
      success: true,
      message: 'Image removed successfully'
    });
  } catch (error) {
    console.error('Error removing image:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
