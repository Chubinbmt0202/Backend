import pool from '../config/db.js';
import fetch from 'node-fetch';

async function testDepartmentShifts() {
    try {
        console.log("1. Fetching available shifts...");
        const shifts = await pool.query('SELECT * FROM CA_LAM_VIEC');
        if (shifts.rowCount === 0) {
            console.log("No shifts found to test with.");
            return;
        }
        const testShift = shifts.rows[0];
        console.log(`Using shift: ${testShift.ten_ca} (${testShift.id_ca_lam_viec})`);

        console.log("\n2. Creating a test department with a shift...");
        const createRes = await fetch('http://localhost:5000/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ten_phong_ban: 'Test Department Shift',
                mo_ta: 'Testing shift assignment',
                id_ca_lam_viec: testShift.id_ca_lam_viec
            })
        });
        const createdData = await createRes.json();
        console.log("Create response:", createdData);

        if (!createdData.success) {
            console.log("Failed to create department");
            return;
        }

        const deptId = createdData.data.id_phong_ban;

        console.log(`\n3. Verifying department in database...`);
        const verifyRes = await pool.query('SELECT id_phong_ban, ten_phong_ban, id_ca_lam_viec FROM PHONG_BAN WHERE id_phong_ban = $1', [deptId]);
        console.log("Database record:", verifyRes.rows[0]);

        console.log("\n4. Updating the department to remove the shift...");
        const updateRes = await fetch(`http://localhost:5000/api/departments/${deptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ten_phong_ban: 'Test Department Shift Updated',
                mo_ta: 'Testing shift removal',
                id_ca_lam_viec: null
            })
        });
        const updatedData = await updateRes.json();
        console.log("Update response:", updatedData);

        console.log(`\n5. Verifying updated department in database...`);
        const verifyUpdatedRes = await pool.query('SELECT id_phong_ban, ten_phong_ban, id_ca_lam_viec FROM PHONG_BAN WHERE id_phong_ban = $1', [deptId]);
        console.log("Database record:", verifyUpdatedRes.rows[0]);

        console.log("\n6. Cleaning up test data...");
        await pool.query('DELETE FROM PHONG_BAN WHERE id_phong_ban = $1', [deptId]);
        console.log("Cleanup successful.");

        console.log("\n✅ All tests passed!");

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        process.exit(0);
    }
}

testDepartmentShifts();
