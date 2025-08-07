import express from 'express';
import multer from 'multer';
import { ImageService } from '../services/ImageService.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    try {
      ImageService.validateImageFile(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  }
});

// POST /api/images/upload - Upload single image to Cloudinary
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const { folder, projectId, uploadedBy } = req.body;

    const options = {
      folder: folder || 'arch-kifah/projects',
      projectId,
      uploadedBy: uploadedBy || 'unknown',
      filename: `${Date.now()}_${req.file.originalname.split('.')[0]}`
    };

    const imageData = await ImageService.uploadSingle(req.file.buffer, options);

    res.json({
      success: true,
      data: imageData,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/images/upload-multiple - Upload multiple images
router.post('/upload-multiple', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const { folder, projectId, uploadedBy } = req.body;

    const options = {
      folder: folder || 'arch-kifah/projects',
      projectId,
      uploadedBy: uploadedBy || 'unknown'
    };

    const result = await ImageService.uploadMultiple(req.files, options);

    res.json({
      success: true,
      data: result,
      message: `${result.successful.length}/${result.total} images uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/images/:publicId - Delete image from Cloudinary
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    await ImageService.delete(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;