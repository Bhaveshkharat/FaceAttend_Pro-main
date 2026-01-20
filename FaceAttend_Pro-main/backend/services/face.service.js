const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

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
      const errorDetail = {
        message: error.message,
        data: error.response?.data,
        status: error.response?.status,
        url: `${PYTHON_SERVICE_URL}/register`
      };

      console.error('Face Service Registration Error:', errorDetail);

      let errorMessage = 'Face registration failed';
      if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      else if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.code === 'ECONNREFUSED') errorMessage = `Connection Refused: backend cannot reach Python service at ${PYTHON_SERVICE_URL}. Check if the microservice is running and the URL is correct.`;
      else if (error.code === 'ENOTFOUND') errorMessage = `Host Not Found: The URL ${PYTHON_SERVICE_URL} is invalid or unreachable.`;
      else errorMessage = error.message;

      throw new Error(errorMessage);
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
      const errorDetail = {
        context: 'recognizeFace',
        message: error.message,
        data: error.response?.data,
        status: error.response?.status,
        url: `${PYTHON_SERVICE_URL}/verify`
      };
      console.error('Face Service Verification Error:', errorDetail);

      let errorMessage = 'Face verification failed';
      if (error.code === 'ECONNREFUSED') errorMessage = `Connection Refused: backend cannot reach Python service at ${PYTHON_SERVICE_URL}.`;
      else if (error.code === 'ENOTFOUND') errorMessage = `Host Not Found: The URL ${PYTHON_SERVICE_URL} is invalid.`;
      else errorMessage = error.message;

      return { matched: false, error: errorMessage };
    }
  }
}

module.exports = new FaceService();
