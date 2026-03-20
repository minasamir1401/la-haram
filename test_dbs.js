const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/register';

async function testRegistration(name, contact) {
    try {
        const form = new FormData();
        form.append('name', name);
        form.append('contact', contact);
        // Search for ANY available image in the project to use for the test
        let imagePath = path.join(__dirname, '../fuzzy-goggles-main/fuzzy-goggles-main/images/hero1.jpg');
        if (!fs.existsSync(imagePath)) {
            // fallback to any jpg it can find
            imagePath = path.join(__dirname, 'server.js'); // Not an image, but sharp will just error or we can skip image check for test
        }
        
        if (fs.existsSync(imagePath)) {
            form.append('image', fs.createReadStream(imagePath));
        } else {
            console.error('No file found to upload for test.');
            return;
        }

        console.log(`Testing registration for: ${name}...`);
        const response = await axios.post(API_URL, form, {
            headers: form.getHeaders(),
        });
        console.log(`✅ Success for ${name}:`, response.data);
    } catch (error) {
        const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`❌ Error testing ${name}:`, errorData);
    }
}

async function runTests() {
    console.log('--- Starting Database Round-Robin Test ---');
    
    // Test 1: Should go to MongoDB
    await testRegistration('Test Mongo 1', '01011111111');
    
    // Test 2: Should go to PostgreSQL
    await testRegistration('Test Postgres 2', '01022222222');
    
    // Test 3: Should go to MongoDB
    await testRegistration('Test Mongo 3', '01033333333');

    console.log('--- Tests completed. Check server logs to see where each was saved. ---');
}

runTests();
