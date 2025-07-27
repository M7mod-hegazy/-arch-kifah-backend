import { uploadImage, deleteImage } from '../config/cloudinary.js';

/**
 * Simplified Image Service
 * Handles all image operations with optimized Cloudinary integration
 */
export class ImageService {
  
  /**
   * Upload single image to Cloudinary
   */
  static async uploadSingle(fileBuffer, options = {}) {
    try {
      const {
        folder = 'arch-kifah/projects',
        projectId,
        filename,
        quality = 'auto',
        maxWidth = 1200,
        maxHeight = 1200
      } = options;

      const uploadOptions = {
        folder: projectId ? `${folder}/${projectId}` : folder,
        public_id: filename || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quality,
        transformation: [
          { width: maxWidth, height: maxHeight, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      };

      const result = await uploadImage(fileBuffer, uploadOptions);

      return this.formatImageData(result, options);
    } catch (error) {
      console.error('ImageService.uploadSingle error:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload multiple images concurrently
   */
  static async uploadMultiple(files, options = {}) {
    try {
      const uploadPromises = files.map((file, index) => {
        const fileOptions = {
          ...options,
          filename: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
        };
        return this.uploadSingle(file.buffer, fileOptions);
      });

      const results = await Promise.allSettled(uploadPromises);
      
      // Filter successful uploads
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      // Log failed uploads
      const failed = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      if (failed.length > 0) {
        console.warn('Some image uploads failed:', failed);
      }

      return {
        successful,
        failed: failed.length,
        total: files.length
      };
    } catch (error) {
      console.error('ImageService.uploadMultiple error:', error);
      throw new Error('Failed to upload images');
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async delete(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      await deleteImage(publicId);
      return true;
    } catch (error) {
      console.error('ImageService.delete error:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Delete multiple images
   */
  static async deleteMultiple(publicIds) {
    try {
      const deletePromises = publicIds.map(publicId => 
        this.delete(publicId).catch(err => {
          console.warn(`Failed to delete image ${publicId}:`, err);
          return false;
        })
      );

      const results = await Promise.allSettled(deletePromises);
      
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;

      return {
        successful,
        failed: publicIds.length - successful,
        total: publicIds.length
      };
    } catch (error) {
      console.error('ImageService.deleteMultiple error:', error);
      throw new Error('Failed to delete images');
    }
  }

  /**
   * Generate different image sizes/transformations
   */
  static generateImageVariants(publicId) {
    const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    return {
      original: `${baseUrl}/${publicId}`,
      thumbnail: `${baseUrl}/w_300,h_300,c_fill/${publicId}`,
      medium: `${baseUrl}/w_600,h_600,c_limit/${publicId}`,
      large: `${baseUrl}/w_1200,h_1200,c_limit/${publicId}`,
      optimized: `${baseUrl}/q_auto,f_auto/${publicId}`
    };
  }

  /**
   * Get image metadata from Cloudinary
   */
  static async getImageInfo(publicId) {
    try {
      // This would require cloudinary admin API
      // For now, return basic info
      return {
        publicId,
        variants: this.generateImageVariants(publicId)
      };
    } catch (error) {
      console.error('ImageService.getImageInfo error:', error);
      throw new Error('Failed to get image info');
    }
  }

  /**
   * Optimize image for web delivery
   */
  static optimizeForWeb(publicId, options = {}) {
    const {
      width = 800,
      height = 600,
      quality = 'auto',
      format = 'auto'
    } = options;

    const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    return `${baseUrl}/w_${width},h_${height},c_limit,q_${quality},f_${format}/${publicId}`;
  }

  /**
   * Create responsive image URLs
   */
  static createResponsiveUrls(publicId) {
    const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    return {
      small: `${baseUrl}/w_400,h_300,c_fill,q_auto,f_auto/${publicId}`,
      medium: `${baseUrl}/w_800,h_600,c_fill,q_auto,f_auto/${publicId}`,
      large: `${baseUrl}/w_1200,h_900,c_fill,q_auto,f_auto/${publicId}`,
      xlarge: `${baseUrl}/w_1600,h_1200,c_fill,q_auto,f_auto/${publicId}`
    };
  }

  /**
   * Format image data for consistent response
   */
  static formatImageData(cloudinaryResult, options = {}) {
    const { uploadedBy = 'unknown' } = options;
    
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      
      // Image properties
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
      
      // Generated variants
      variants: this.generateImageVariants(cloudinaryResult.public_id),
      
      // Metadata
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      
      // Optimized URLs
      thumbnail: this.optimizeForWeb(cloudinaryResult.public_id, { width: 300, height: 300 }),
      optimized: this.optimizeForWeb(cloudinaryResult.public_id)
    };
  }

  /**
   * Validate image file
   */
  static validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 50MB.');
    }

    return true;
  }

  /**
   * Validate multiple image files
   */
  static validateImageFiles(files) {
    const maxFiles = 20;

    if (files.length > maxFiles) {
      throw new Error(`Too many files. Maximum ${maxFiles} files allowed.`);
    }

    files.forEach((file, index) => {
      try {
        this.validateImageFile(file);
      } catch (error) {
        throw new Error(`File ${index + 1}: ${error.message}`);
      }
    });

    return true;
  }

  /**
   * Get upload progress (for future implementation)
   */
  static getUploadProgress(uploadId) {
    // This would be implemented with a progress tracking system
    // For now, return a placeholder
    return {
      uploadId,
      progress: 100,
      status: 'completed'
    };
  }
}
