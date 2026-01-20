const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

class FaceService {

  /**
   * Send image to Python Service for Registration
   * @param {string} imagePath - Path to the image file
   * @param {string} userId - ID of the user
   */
  async registerFace(imagePath, userId) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      formData.append('userId', userId);

      const response = await axios.post(`${PYTHON_SERVICE_URL}/register`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      return response.data;
    } catch (error) {
      console.error('Face Service Registration Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Face registration failed');
    }
  }

  /**
   * Send image to Python Service for Verification
   * @param {string} imagePath - Path to the image file
   */
  async recognizeFace(imagePath) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));

      const response = await axios.post(`${PYTHON_SERVICE_URL}/verify`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      const { verified, userId, score, message } = response.data;

      if (verified) {
        // Fetch user name if needed, but the controller handles attendance mainly with ID
        const User = require('../models/User');
        const user = await User.findById(userId);

        return {
          matched: true,
          userId: userId,
          name: user ? user.name : "Unknown",
          score: score
        };
      } else {
        return {
          matched: false,
          message: message || "Not recognized"
        };
      }

    } catch (error) {
      console.error('Face Service Verification Error:', error.response?.data || error.message);
      // Return matched:false instead of throwing to let controller handle it gracefully
      return { matched: false, error: error.message };
    }
  }
}

module.exports = new FaceService();
