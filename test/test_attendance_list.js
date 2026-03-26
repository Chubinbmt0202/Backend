const url = `http://localhost:3001/api/attendance/list/daily?date=2026-03-12`;

async function testApi() {
    try {
        console.log(`Testing Daily Attendance List API: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));
        
        if (response.status === 200 && data.success) {
            console.log('SUCCESS: Attendance List API is working!');
        } else {
            console.log('FAILURE: API returned an error.');
        }
    } catch (error) {
        console.error('ERROR: Could not connect to the API.', error.message);
    }
}

testApi();
