import cloudinary from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Upload single image
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'ecommerce/products',
      use_filename: true,
      unique_filename: true,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
        { format: 'auto' }
      ]
    });

    return res.status(200).json(
      new ApiResponse(200, {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      }, 'Image uploaded successfully')
    );
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new ApiError(500, 'Failed to upload image to Cloudinary');
  }
});

// Upload multiple images
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No image files provided');
  }

  try {
    const uploadPromises = req.files.map(file => 
      cloudinary.uploader.upload(file.path, {
        folder: 'ecommerce/products',
        use_filename: true,
        unique_filename: true,
        resource_type: 'auto',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
          { format: 'auto' }
        ]
      })
    );

    const results = await Promise.all(uploadPromises);

    const uploadedImages = results.map(result => ({
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    }));

    return res.status(200).json(
      new ApiResponse(200, {
        images: uploadedImages,
        count: uploadedImages.length
      }, `${uploadedImages.length} images uploaded successfully`)
    );
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new ApiError(500, 'Failed to upload images to Cloudinary');
  }
});

// Delete image
const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, 'Public ID is required');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'not found') {
      throw new ApiError(404, 'Image not found');
    }

    return res.status(200).json(
      new ApiResponse(200, { result: result.result }, 'Image deleted successfully')
    );
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new ApiError(500, 'Failed to delete image from Cloudinary');
  }
});

// Get Cloudinary upload signature for direct frontend uploads
const getUploadSignature = asyncHandler(async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: 'ecommerce/products'
      },
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json(
      new ApiResponse(200, {
        signature,
        timestamp,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        folder: 'ecommerce/products'
      }, 'Upload signature generated successfully')
    );
  } catch (error) {
    console.error('Signature generation error:', error);
    throw new ApiError(500, 'Failed to generate upload signature');
  }
});

export {
  uploadImage,
  uploadImages,
  deleteImage,
  getUploadSignature
};
