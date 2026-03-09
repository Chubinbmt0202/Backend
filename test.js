const testAPI = async () => {
    try {
        console.log("=== Testing Add Employee ===");
        const addRes = await fetch('http://localhost:3001/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "testuser2",
                password: "password123",
                full_name: "Test User 2"
            })
        });
        const addData = await addRes.json();
        console.log("Add Employee Status:", addRes.status);
        console.log("Add Employee Response:", addData);

        console.log("\n=== Testing Login ===");
        const loginRes = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "testuser2",
                password: "password123"
            })
        });
        const loginData = await loginRes.json();
        console.log("Login Status:", loginRes.status);
        console.log("Login Response:", loginData);
    } catch (error) {
        console.error("Test Error:", error);
    }
};

testAPI();
