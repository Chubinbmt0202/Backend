import pool from './config/db.js';

async function migrate() {
    try {
        console.log("Đang thêm cột email và gioi_tinh vào bảng NHAN_VIEN...");
        await pool.query(`
            ALTER TABLE NHAN_VIEN 
            ADD COLUMN IF NOT EXISTS email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS gioi_tinh VARCHAR(10);
        `);
        console.log("Đã cập nhật cấu trúc database thành công!");
    } catch (error) {
        console.error("Lỗi khi cập nhật database:", error);
    } finally {
        pool.end();
    }
}

migrate();
