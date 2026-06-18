import pool from '../config/db.js';

async function runMigrations() {
    try {
        console.log("Starting database migrations/schema updates...");

        // 1. NHAN_VIEN table updates
        console.log("Updating NHAN_VIEN table...");
        await pool.query(`
            ALTER TABLE NHAN_VIEN 
            ADD COLUMN IF NOT EXISTS hinh_anh VARCHAR(255),
            ADD COLUMN IF NOT EXISTS ngay_cap_nhat_khuon_mat TIMESTAMP,
            ADD COLUMN IF NOT EXISTS email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS gioi_tinh VARCHAR(10);
        `);
        console.log("NHAN_VIEN table columns verified/added.");

        // 2. CHAM_CONG table updates:
        // Check if url_anh exists, rename it to url_anh_vao
        const checkUrlAnh = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'cham_cong' AND column_name = 'url_anh';
        `);

        if (checkUrlAnh.rowCount > 0) {
            console.log("Renaming CHAM_CONG.url_anh to url_anh_vao...");
            await pool.query('ALTER TABLE CHAM_CONG RENAME COLUMN url_anh TO url_anh_vao;');
        }

        // Add url_anh_ra if not exists
        await pool.query(`
            ALTER TABLE CHAM_CONG 
            ADD COLUMN IF NOT EXISTS url_anh_ra VARCHAR(255);
        `);
        console.log("CHAM_CONG table columns verified/updated.");

        // 3. Create GIAI_TRINH_DI_TRE table if not exists
        console.log("Creating GIAI_TRINH_DI_TRE table if not exists...");
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
        console.log("GIAI_TRINH_DI_TRE table verified/created.");

        console.log("Migrations applied successfully!");
    } catch (error) {
        console.error("Error running migrations:", error);
    } finally {
        pool.end();
    }
}

runMigrations();
