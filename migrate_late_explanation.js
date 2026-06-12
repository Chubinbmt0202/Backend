import pool from './config/db.js';

async function migrate() {
    try {
        console.log("Đang tạo bảng GIAI_TRINH_DI_TRE...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS GIAI_TRINH_DI_TRE (
                id_giai_trinh VARCHAR(8) PRIMARY KEY,
                id_nhan_vien VARCHAR(8) NOT NULL,
                ngay_giai_trinh DATE NOT NULL,
                gio_vao_tre TIMESTAMP NOT NULL,
                ly_do VARCHAR(255) NOT NULL,
                trang_thai BOOLEAN DEFAULT NULL, -- NULL: Chờ duyệt, TRUE: Đã duyệt, FALSE: Từ chối
                id_nguoi_duyet VARCHAR(8),
                ngay_duyet TIMESTAMP,
                ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ghi_chu VARCHAR(255),
                CONSTRAINT FK_GiaiTrinh_NhanVien FOREIGN KEY (id_nhan_vien) REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE CASCADE,
                CONSTRAINT FK_GiaiTrinh_NguoiDuyet FOREIGN KEY (id_nguoi_duyet) REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE SET NULL
            );
        `);
        console.log("Đã tạo bảng GIAI_TRINH_DI_TRE thành công!");
    } catch (error) {
        console.error("Lỗi khi tạo bảng GIAI_TRINH_DI_TRE:", error);
    } finally {
        pool.end();
    }
}

migrate();
