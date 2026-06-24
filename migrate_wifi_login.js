import pool from './config/db.js';

async function run() {
  try {
    await pool.query('ALTER TABLE THIET_BI_DANG_NHAP ADD COLUMN dia_chi_wifi VARCHAR(255);');
    console.log('Added dia_chi_wifi column successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
