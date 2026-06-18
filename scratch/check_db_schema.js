import pool from '../config/db.js';

async function check() {
  try {
    const chamCongCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cham_cong';
    `);
    console.log('--- Columns in CHAM_CONG table ---');
    console.log(chamCongCols.rows);

    const nhanVienCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nhan_vien';
    `);
    console.log('--- Columns in NHAN_VIEN table ---');
    console.log(nhanVienCols.rows);

  } catch (err) {
    console.error('Error querying columns:', err.message);
  } finally {
    pool.end();
  }
}

check();
