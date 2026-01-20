const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testRegistration() {
    try {
        // Test 1: Health check
        console.log('Testing Python service health...');
        const health = await axios.get('http://localhost:8000/');
        console.log('✅ Health check:', health.data);

        // Test 2: Check if we can reach register endpoint
        console.log('\nTesting registration endpoint...');

        // You'll need a test image - create a simple one or use existing
        // For now, just test the endpoint structure
        const testImagePath = path.join(__dirname, 'test_face.jpg');

        if (!fs.existsSync(testImagePath)) {
            console.log('⚠️  No test image found at:', testImagePath);
            console.log('Please capture a photo and save it as test_face.jpg in backend folder');
            return;
        }

        const formData = new FormData();
        formData.append('image', fs.createReadStream(testImagePath));
        formData.append('userId', 'test-user-123');

        const response = await axios.post('http://localhost:8000/register', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log('✅ Registration response:', response.data);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testRegistration();
