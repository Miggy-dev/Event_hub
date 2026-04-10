import axios from 'axios';

async function testRegister() {
    try {
        const timestamp = Date.now();
        const data = {
            username: `testuser_${timestamp}`,
            password: 'password123',
            name: 'Test User',
            email: 'test@example.com',
            phone: '1234567890',
            roleName: 'User',
            bio: 'Test Bio'
        };

        console.log('Sending test registration:', data);
        const res = await axios.post('http://localhost:5000/register', data);
        console.log('Response:', res.data);
    } catch (error) {
        console.error('Registration failed:', error.response?.data || error.message);
    }
}

testRegister();
