import pool from '../config/db.js';

const run = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS DON_DANG_KY_OT (
                id_don_ot VARCHAR(8) PRIMARY KEY,
                id_nhan_vien VARCHAR(8) NOT NULL,
                ngay_dang_ky_ot DATE NOT NULL,
                gio_bat_dau TIME NOT NULL,
                gio_ket_thuc_du_kien TIME NOT NULL,
                ly_do VARCHAR(255),
                trang_thai VARCHAR(20) DEFAULT 'CHO_DUYET',
                ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_DonOT_NhanVien FOREIGN KEY (id_nhan_vien) REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE CASCADE
            );
        `);
        console.log("Đã tạo bảng DON_DANG_KY_OT thành công!");
    } catch (err) {
        console.error("Lỗi tạo bảng:", err);
    } finally {
        pool.end();
    }
};

run();
