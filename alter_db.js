import pool from './config/db.js';

async function run() {
  try {
    await pool.query('ALTER TABLE NHAN_VIEN ADD COLUMN hinh_anh VARCHAR(255);');
    console.log('Added hinh_anh column successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

run();
