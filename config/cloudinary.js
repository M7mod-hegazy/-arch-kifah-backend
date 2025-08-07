import { v2 as cloudinary } from 'cloudinary';

export const setupCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not properly configured');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });

  console.log('Cloudinary configured successfully');
};

export const uploadImage = async (fileBuffer, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'arch-kifah/projects',
      resource_type: 'image',
      quality: 'auto',
      format: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' }
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      throw new Error(`Failed to delete image: ${result.result}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export const generateImageUrl = (publicId, options = {}) => {
  try {
    const defaultOptions = {
      quality: 'auto'
    };

    const urlOptions = { ...defaultOptions, ...options };
    
    return cloudinary.url(publicId, urlOptions);
  } catch (error) {
    console.error('Error generating Cloudinary URL:', error);
    throw error;
  }
};

export const generateThumbnailUrl = (publicId, width = 300, height = 200) => {
  return generateImageUrl(publicId, {
    width,
    height,
    crop: 'fill'
  });
};

export default cloudinary;
