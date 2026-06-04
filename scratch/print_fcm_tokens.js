import pool from '../config/db.js';

async function run() {
  try {
    const result = await pool.query('SELECT id_nhan_vien, ho_va_ten, fcm_token FROM NHAN_VIEN;');
    console.log('Danh sách FCM Tokens:', result.rows);
  } catch (error) {
    console.error('Lỗi truy vấn:', error);
  } finally {
    await pool.end();
  }
}

run();
