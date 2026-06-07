import pool from '../config/db.js';

const run = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS THIET_BI_DANG_NHAP (
                id_thiet_bi VARCHAR(15) PRIMARY KEY,
                id_tai_khoan VARCHAR(8) NOT NULL,
                ten_thiet_bi VARCHAR(255),
                he_dieu_hanh VARCHAR(255),
                dia_chi_ip VARCHAR(50),
                thoi_gian_dang_nhap TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_ThietBi_TaiKhoan FOREIGN KEY (id_tai_khoan) REFERENCES TAI_KHOAN(id_tai_khoan) ON DELETE CASCADE
            );
        `);
        console.log("Đã tạo bảng THIET_BI_DANG_NHAP thành công!");
    } catch (err) {
        console.error("Lỗi tạo bảng:", err);
    } finally {
        pool.end();
    }
};

run();
