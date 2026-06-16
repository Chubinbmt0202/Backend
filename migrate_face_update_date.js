import pool from './config/db.js';

async function migrate() {
    try {
        console.log("Đang thêm cột ngay_cap_nhat_khuon_mat vào bảng NHAN_VIEN...");
        await pool.query(`
            ALTER TABLE NHAN_VIEN 
            ADD COLUMN IF NOT EXISTS ngay_cap_nhat_khuon_mat TIMESTAMP;
        `);
        console.log("Đã cập nhật cấu trúc database thành công!");
    } catch (error) {
        console.error("Lỗi khi cập nhật database:", error);
    } finally {
        pool.end();
    }
}

migrate();
