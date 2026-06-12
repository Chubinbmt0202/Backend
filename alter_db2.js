import pool from './config/db.js';
async function run() {
  try {
    await pool.query('ALTER TABLE CHAM_CONG RENAME COLUMN url_anh TO url_anh_vao;');
    await pool.query('ALTER TABLE CHAM_CONG ADD COLUMN url_anh_ra VARCHAR(255);');
    console.log('Altered table CHAM_CONG successfully.');
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}
run();
