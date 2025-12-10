const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload base64 image to ImgBB
 * @param {string} base64Image - Base64 encoded image string
 * @returns {Promise<string>} - ImgBB image URL
 */
const uploadToImgBB = async (base64Image) => {
  try {
    // Remove data:image/xxx;base64, prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );
    
    if (response.data.success) {
      return response.data.data.url;
    }
    
    throw new Error('ImgBB upload failed');
  } catch (error) {
    console.error('ImgBB Upload Error:', error.response?.data || error.message);
    throw new Error('Failed to upload image to ImgBB');
  }
};

/**
 * Upload image from file buffer
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<string>} - ImgBB image URL
 */
const uploadBufferToImgBB = async (buffer) => {
  try {
    const base64Image = buffer.toString('base64');
    return await uploadToImgBB(base64Image);
  } catch (error) {
    throw new Error('Failed to upload buffer to ImgBB');
  }
};

module.exports = {
  uploadToImgBB,
  uploadBufferToImgBB
};
