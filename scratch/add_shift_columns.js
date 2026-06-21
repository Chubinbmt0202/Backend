import pool from '../config/db.js';

async function addShiftColumns() {
    try {
        console.log("Adding mo_vao_truoc and dong_ra_sau to CA_LAM_VIEC...");
        await pool.query(`
            ALTER TABLE CA_LAM_VIEC 
            ADD COLUMN IF NOT EXISTS mo_vao_truoc NUMERIC DEFAULT 60,
            ADD COLUMN IF NOT EXISTS dong_ra_sau NUMERIC DEFAULT 120;
        `);
        console.log("Columns added successfully!");
    } catch (error) {
        console.error("Error altering table:", error);
    } finally {
        pool.end();
    }
}

addShiftColumns();
