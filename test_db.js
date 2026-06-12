import pool from './config/db.js';
async function run() {
  const res = await pool.query('SELECT id_nhan_vien, gio_vao, gio_ra, ghi_chu FROM CHAM_CONG ORDER BY gio_vao DESC LIMIT 10');
  console.log(res.rows);
  process.exit(0);
}
run();
