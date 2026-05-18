import pool from '../config/db.js';

async function run() {
  try {
    console.log('Đang tạo bảng THONG_BAO trong PostgreSQL...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS THONG_BAO (
        id_thong_bao VARCHAR(8) PRIMARY KEY,
        id_nhan_vien VARCHAR(8) NOT NULL,
        tieu_de VARCHAR(255) NOT NULL,
        noi_dung TEXT NOT NULL,
        loai_thong_bao VARCHAR(50) DEFAULT 'SYSTEM',
        da_doc BOOLEAN DEFAULT FALSE,
        ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_ThongBao_NhanVien FOREIGN KEY (id_nhan_vien) REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE CASCADE
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('Thành công! Đã tạo bảng THONG_BAO.');
  } catch (error) {
    console.error('Lỗi khi tạo bảng THONG_BAO:', error);
  } finally {
    await pool.end();
  }
}

run();
