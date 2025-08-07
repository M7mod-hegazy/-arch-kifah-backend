import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';

/**
 * Simplified Project Service
 * Handles all project operations with optimized MongoDB and Cloudinary integration
 */
export class ProjectService {
  static collection = 'projects';
  // Simple in-memory lock to prevent concurrent updates to the same project
  static updateLocks = new Map();

  /**
   * Create a new project with simplified data structure
   */
  static async create(projectData) {
    try {
      const db = getDB();
      const now = new Date().toISOString();
      
      // Simplified project structure
      const project = {
        title: projectData.title,
        customer: projectData.customer,
        startDate: projectData.startDate,
        endDate: projectData.endDate,
        status: projectData.status || 'waiting',
        totalCost: projectData.totalCost || 0,
        originalCost: projectData.originalCost || projectData.totalCost || 0,
        familyId: projectData.familyId || null, // IMPORTANT: Include familyId

        // Simplified arrays
        subgoals: projectData.subgoals || [],
        images: projectData.images || [],

        // Metadata
        createdAt: now,
        updatedAt: now,
        createdBy: projectData.createdBy,
        updatedBy: projectData.updatedBy,
        
        // Simplified history - only major events
        history: [{
          type: 'created',
          description: 'تم إنشاء المشروع',
          timestamp: now,
          userId: projectData.userId || projectData.createdBy || 'unknown',
          userName: projectData.userName || projectData.createdBy || 'مستخدم غير معروف'
        }]
      };

      const result = await db.collection(this.collection).insertOne(project);
      
      return {
        ...project,
        id: result.insertedId.toString(),
        _id: undefined
      };
    } catch (error) {
      console.error('ProjectService.create error:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * Update project with optimized operations and retry logic
   */
  static async update(projectId, updateData, retryCount = 0) {
    const maxRetries = 3;

    // Check if another update is in progress for this project
    if (this.updateLocks.has(projectId)) {
      console.log(`Update already in progress for project ${projectId}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.update(projectId, updateData, retryCount);
    }

    // Set lock
    this.updateLocks.set(projectId, true);

    try {
      if (!ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID');
      }

      const db = getDB();
      const now = new Date().toISOString();

      // Get current project FIRST to track old values before any changes
      let currentProject = null;
      if (this.shouldAddHistory(updateData)) {
        currentProject = await db.collection(this.collection).findOne(
          { _id: new ObjectId(projectId) }
        );
        console.log('Current project for history tracking:', {
          id: currentProject?._id,
          totalCost: currentProject?.totalCost,
          status: currentProject?.status,
          subgoalsCount: currentProject?.subgoals?.length
        });
      }

      // Clean update data
      const cleanData = this.cleanUpdateData(updateData);
      cleanData.updatedAt = now;

      // Use atomic operations for better performance
      const updateOperations = {
        $set: cleanData
      };

      // Handle array operations separately for better performance
      if (updateData.subgoals !== undefined) {
        updateOperations.$set.subgoals = updateData.subgoals;
        console.log('Updating subgoals:', updateData.subgoals.length, 'goals');
      }

      if (updateData.images !== undefined) {
        updateOperations.$set.images = updateData.images;
        console.log('Updating images:', updateData.images.length, 'images');
      }

      if (updateData.totalCost !== undefined) {
        updateOperations.$set.totalCost = updateData.totalCost;
        console.log('Updating totalCost from', currentProject?.totalCost, 'to', updateData.totalCost);
      }

      // Add history entry only for significant changes
      if (this.shouldAddHistory(updateData) && currentProject) {
        // Check if any field actually changed
        const hasActualChanges =
          this.shouldAddHistoryForField('totalCost', updateData.totalCost, currentProject.totalCost) ||
          this.shouldAddHistoryForField('status', updateData.status, currentProject.status) ||
          this.shouldAddHistoryForField('subgoals', updateData.subgoals, currentProject.subgoals);

        if (hasActualChanges) {
          const historyEntry = {
            type: this.getHistoryType(updateData),
            description: this.getHistoryDescription(updateData, currentProject),
            timestamp: now,
            userId: updateData.userId || updateData.updatedBy || 'unknown',
            userName: updateData.userName || updateData.updatedBy || 'مستخدم غير معروف',
            changes: this.getDetailedChanges(updateData, currentProject)
          };

          console.log('Adding history entry for actual changes:', historyEntry);

          updateOperations.$push = {
            history: {
              $each: [historyEntry],
              $slice: -20 // Keep only last 20 history entries
            }
          };
        } else {
          console.log('No actual changes detected, skipping history entry');
        }
      }

      console.log('Executing update operations:', JSON.stringify(updateOperations, null, 2));

      const result = await db.collection(this.collection).findOneAndUpdate(
        { _id: new ObjectId(projectId) },
        updateOperations,
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error('Project not found');
      }

      console.log('Update completed. History entries count:', result.history?.length || 0);

      // Log the latest history entry if it was added
      if (result.history && result.history.length > 0) {
        const latestEntry = result.history[result.history.length - 1];
        console.log('Latest history entry:', {
          type: latestEntry.type,
          description: latestEntry.description,
          timestamp: latestEntry.timestamp,
          changes: latestEntry.changes
        });
      }

      return {
        ...result,
        id: result._id.toString(),
        _id: undefined
      };
    } catch (error) {
      console.error('ProjectService.update error:', error);

      // Retry on network timeout errors
      if ((error.name === 'MongoNetworkTimeoutError' || error.name === 'MongoServerError') && retryCount < maxRetries) {
        console.log(`Retrying update operation (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.update(projectId, updateData, retryCount + 1);
      }

      throw error;
    } finally {
      // Always release the lock
      this.updateLocks.delete(projectId);
    }
  }

  /**
   * Get project by ID
   */
  static async getById(projectId) {
    try {
      if (!ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID');
      }

      const db = getDB();
      const project = await db.collection(this.collection).findOne(
        { _id: new ObjectId(projectId) }
      );

      if (!project) {
        return null;
      }

      return {
        ...project,
        id: project._id.toString(),
        _id: undefined
      };
    } catch (error) {
      console.error('ProjectService.getById error:', error);
      throw error;
    }
  }

  /**
   * Get all projects with pagination and filtering
   */
  static async getAll(options = {}) {
    try {
      const db = getDB();
      const {
        page = 1,
        limit = 50,
        status,
        search,
        sortBy = 'updatedAt',
        sortOrder = -1
      } = options;

      // Build query
      const query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const projects = await db.collection(this.collection)
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      // Transform results
      return projects.map(project => ({
        ...project,
        id: project._id.toString(),
        _id: undefined
      }));
    } catch (error) {
      console.error('ProjectService.getAll error:', error);
      throw error;
    }
  }

  /**
   * Delete project and cleanup images
   */
  static async delete(projectId) {
    try {
      if (!ObjectId.isValid(projectId)) {
        throw new Error('Invalid project ID');
      }

      const db = getDB();
      
      // Get project first to cleanup images
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Cleanup Cloudinary images
      if (project.images && project.images.length > 0) {
        await this.cleanupImages(project.images);
      }

      // Delete project
      await db.collection(this.collection).deleteOne(
        { _id: new ObjectId(projectId) }
      );

      return true;
    } catch (error) {
      console.error('ProjectService.delete error:', error);
      throw error;
    }
  }

  /**
   * Add images to project with Cloudinary upload
   */
  static async addImages(projectId, imageFiles, uploadedBy) {
    try {
      const uploadPromises = imageFiles.map(async (file) => {
        const result = await uploadImage(file.buffer, {
          folder: `arch-kifah/projects/${projectId}`,
          public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          url: result.secure_url,
          thumbnail: result.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
          name: file.originalname,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          uploadedAt: new Date().toISOString(),
          uploadedBy
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);

      // Add images to project
      const db = getDB();
      await db.collection(this.collection).updateOne(
        { _id: new ObjectId(projectId) },
        {
          $push: { images: { $each: uploadedImages } },
          $set: { updatedAt: new Date().toISOString() }
        }
      );

      return uploadedImages;
    } catch (error) {
      console.error('ProjectService.addImages error:', error);
      throw error;
    }
  }

  /**
   * Remove image from project and Cloudinary
   */
  static async removeImage(projectId, imageId) {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const image = project.images.find(img => img.id === imageId);
      if (!image) {
        throw new Error('Image not found');
      }

      // Delete from Cloudinary
      if (image.publicId) {
        await deleteImage(image.publicId);
      }

      // Remove from project
      const db = getDB();
      await db.collection(this.collection).updateOne(
        { _id: new ObjectId(projectId) },
        {
          $pull: { images: { id: imageId } },
          $set: { updatedAt: new Date().toISOString() }
        }
      );

      return true;
    } catch (error) {
      console.error('ProjectService.removeImage error:', error);
      throw error;
    }
  }

  // Helper methods
  static cleanUpdateData(data) {
    const cleaned = { ...data };
    delete cleaned.id;
    delete cleaned._id;
    delete cleaned.createdAt;
    delete cleaned.history;
    return cleaned;
  }

  static shouldAddHistory(updateData) {
    // Only add history for significant changes
    return updateData.status ||
           updateData.subgoals ||
           updateData.totalCost !== undefined;
  }

  static shouldAddHistoryForField(field, newValue, oldValue) {
    // For cost, only add history if the value actually changed
    if (field === 'totalCost') {
      return newValue !== undefined && Number(newValue) !== Number(oldValue || 0);
    }

    // For status, only add if it actually changed
    if (field === 'status') {
      return newValue && newValue !== oldValue;
    }

    // For subgoals, only add if count changed
    if (field === 'subgoals') {
      const oldCount = oldValue?.length || 0;
      const newCount = newValue?.length || 0;
      return newCount !== oldCount;
    }

    return true;
  }

  static getHistoryType(updateData) {
    if (updateData.status) return 'status_changed';
    if (updateData.subgoals) return 'goals_updated';
    if (updateData.totalCost !== undefined) return 'cost_updated';
    return 'updated';
  }

  static getHistoryDescription(updateData, currentProject) {
    if (updateData.status) {
      const oldStatus = this.getStatusText(currentProject?.status);
      const newStatus = this.getStatusText(updateData.status);
      return `تم تغيير الحالة من "${oldStatus}" إلى "${newStatus}"`;
    }

    if (updateData.subgoals) {
      const oldCount = currentProject?.subgoals?.length || 0;
      const newCount = updateData.subgoals.length;
      return `تم تحديث الأهداف (${oldCount} → ${newCount} أهداف)`;
    }

    if (updateData.totalCost !== undefined) {
      const oldCost = currentProject?.totalCost || 0;
      const newCost = updateData.totalCost;
      const difference = newCost - oldCost;
      const sign = difference > 0 ? '+' : '';
      return `تم تحديث التكلفة من ${oldCost.toLocaleString()} إلى ${newCost.toLocaleString()} (${sign}${difference.toLocaleString()})`;
    }

    return 'تم تحديث المشروع';
  }

  static getDetailedChanges(updateData, currentProject) {
    const changes = {};

    if (updateData.status) {
      changes.status = {
        from: currentProject?.status,
        to: updateData.status,
        fromText: this.getStatusText(currentProject?.status),
        toText: this.getStatusText(updateData.status)
      };
    }

    if (updateData.totalCost !== undefined) {
      const oldCost = currentProject?.totalCost || 0;
      changes.totalCost = {
        from: oldCost,
        to: updateData.totalCost,
        difference: updateData.totalCost - oldCost
      };
    }

    if (updateData.subgoals) {
      changes.subgoals = {
        from: currentProject?.subgoals?.length || 0,
        to: updateData.subgoals.length,
        difference: updateData.subgoals.length - (currentProject?.subgoals?.length || 0)
      };
    }

    return changes;
  }

  static getStatusText(status) {
    const statusMap = {
      'planning': 'التخطيط',
      'in-progress': 'قيد التنفيذ',
      'completed': 'مكتمل',
      'on-hold': 'معلق',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status || 'غير محدد';
  }

  static async cleanupImages(images) {
    const deletePromises = images
      .filter(img => img.publicId)
      .map(img => deleteImage(img.publicId).catch(err => 
        console.warn(`Failed to delete image ${img.publicId}:`, err)
      ));
    
    await Promise.allSettled(deletePromises);
  }
}
