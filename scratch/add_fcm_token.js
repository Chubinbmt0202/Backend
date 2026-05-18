import pool from '../config/db.js';

async function run() {
  try {
    console.log('Đang thêm cột fcm_token vào bảng NHAN_VIEN...');
    await pool.query('ALTER TABLE NHAN_VIEN ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);');
    console.log('Thành công! Đã thêm cột fcm_token vào bảng NHAN_VIEN.');
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error);
  } finally {
    await pool.end();
  }
}

run();
