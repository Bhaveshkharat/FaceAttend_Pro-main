const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

class FaceService {

  /**
   * Send image to Python Service for Registration
   * @param {string} imagePath - Path to the image file
   * @param {string} userId - ID of the user
   * @param {string} managerId - ID of the manager
   */
  async registerFace(imagePath, userId, managerId) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      formData.append('userId', userId);
      if (managerId) formData.append('managerId', managerId);

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
   * @param {string} managerId - ID of the manager (optional context)
   */
  async recognizeFace(imagePath, managerId) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      if (managerId) formData.append('managerId', managerId);

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

  /**
   * Delete face profile from MongoDB
   * @param {string} userId - ID of the user
   */
  async deleteFace(userId) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.useDb(process.env.MONGO_URI.split('/').pop().split('?')[0] || 'face_attendance');
      const faceCollection = db.collection('face_profiles');

      const result = await faceCollection.deleteOne({ userId });
      return { success: result.deletedCount > 0, message: result.deletedCount > 0 ? "Face deleted" : "Face not found" };
    } catch (error) {
      console.error('Delete Face Error:', error);
      throw error;
    }
  }

  /**
   * Get list of userIds with registered faces
   */
  async getRegisteredFaces() {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.useDb(process.env.MONGO_URI.split('/').pop().split('?')[0] || 'face_attendance');
      const faceCollection = db.collection('face_profiles');

      const faces = await faceCollection.find({}, { projection: { userId: 1, _id: 0 } }).toArray();
      return faces.map(f => f.userId);
    } catch (error) {
      console.error('Get Registered Faces Error:', error);
      return [];
    }
  }
}

module.exports = new FaceService();
