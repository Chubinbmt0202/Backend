
-- Xóa các bảng nếu đã tồn tại (theo thứ tự tránh lỗi FK)
DROP TABLE IF EXISTS VAI_TRO_QUYEN_HAN CASCADE;
DROP TABLE IF EXISTS CHAM_CONG CASCADE;
DROP TABLE IF EXISTS DON_XIN_NGHI CASCADE;
DROP TABLE IF EXISTS NHAN_VIEN CASCADE;
DROP TABLE IF EXISTS TAI_KHOAN CASCADE;
DROP TABLE IF EXISTS VAI_TRO CASCADE;
DROP TABLE IF EXISTS QUYEN CASCADE;
DROP TABLE IF EXISTS LOAI_PHEP CASCADE;
DROP TABLE IF EXISTS PHONG_BAN CASCADE;
DROP TABLE IF EXISTS CA_LAM_VIEC CASCADE;
DROP TABLE IF EXISTS DIEM_CHAM_CONG CASCADE;
DROP TABLE IF EXISTS WIFI_VAN_PHONG CASCADE;
DROP TABLE IF EXISTS VAN_PHONG CASCADE;

-- ========================================================
-- 1. TẠO CÁC BẢNG (TABLES)
-- ========================================================
-- ========================================================
-- PHẦN 1: TẠO CÁC BẢNG (TABLES) VÀ KHÓA CHÍNH (PRIMARY KEYS)
-- ========================================================

-- 1. Bảng Quyền
CREATE TABLE QUYEN (
    id_quyen VARCHAR(8) PRIMARY KEY,
    ten_quyen VARCHAR(255),
    mo_ta VARCHAR(255)
);

-- 2. Bảng Vai Trò
CREATE TABLE VAI_TRO (
    id_vai_tro VARCHAR(8) PRIMARY KEY,
    ten_vai_tro VARCHAR(255),
    mo_ta VARCHAR(255),
    ngay_tao TIMESTAMP,
    id_nguoi_dung VARCHAR(8)
);

-- 3. Bảng Vai Trò - Quyền Hạn (Bảng trung gian)
CREATE TABLE VAI_TRO_QUYEN_HAN (
    id_vai_tro VARCHAR(8),
    id_quyen VARCHAR(8),
    PRIMARY KEY (id_vai_tro, id_quyen)
);

-- 4. Bảng Tài Khoản
CREATE TABLE TAI_KHOAN (
    id_tai_khoan VARCHAR(8) PRIMARY KEY,
    ten_dang_nhap VARCHAR(255),
    mat_khau VARCHAR(255),
    id_vai_tro VARCHAR(8),
    trang_thai BOOLEAN,
    ngay_tao TIMESTAMP
);

-- 5. Bảng Phòng Ban
CREATE TABLE PHONG_BAN (
    id_phong_ban VARCHAR(8) PRIMARY KEY,
    ten_phong_ban VARCHAR(255),
    mo_ta VARCHAR(255),
    id_nguoi_dung VARCHAR(8),
    ngay_tao TIMESTAMP
);

-- 6. Bảng Nhân Viên
CREATE TABLE NHAN_VIEN (
    id_nhan_vien VARCHAR(8) PRIMARY KEY,
    ho_va_ten VARCHAR(255),
    ngay_sinh DATE,
    so_dien_thoai VARCHAR(10),
    dia_chi VARCHAR(255),
    du_lieu_khuon_mat CHAR(255), -- Đặt độ dài cho CHAR để chứa dữ liệu (hoặc có thể dùng TEXT tuỳ hệ quản trị)
    id_tai_khoan VARCHAR(8),
    id_phong_ban VARCHAR(8)
);

-- 7. Bảng Loại Phép
CREATE TABLE LOAI_PHEP (
    id_loai_phep VARCHAR(8) PRIMARY KEY,
    ten_phep VARCHAR(255),
    so_ngay_toi_da NUMERIC,
    co_luong BOOLEAN,
    mo_ta VARCHAR(255) 
);

-- 8. Bảng Đơn Xin Nghỉ
CREATE TABLE DON_XIN_NGHI (
    id_don_xin_nghi VARCHAR(8) PRIMARY KEY,
    id_nguoi_dung VARCHAR(8),
    id_loai_phep VARCHAR(8),
    ngay_bat_dau DATE,
    ngay_ket_thuc DATE,
    ly_do VARCHAR(255),
    trang_thai BOOLEAN,
    id_nguoi_duyet VARCHAR(8),
    ngay_duyet TIMESTAMP,
    ngay_tao TIMESTAMP,
    ghi_chu VARCHAR(255)
);

-- 9. Bảng Ca Làm Việc
CREATE TABLE CA_LAM_VIEC (
    id_ca_lam_viec VARCHAR(8) PRIMARY KEY,
    ten_ca VARCHAR(255),
    gio_vao TIMESTAMP,
    gio_ra TIMESTAMP,
    phut_cho_phep_tre NUMERIC,
    so_cong FLOAT,
    nghi_trua BOOLEAN,
    bat_dau_nghi TIMESTAMP,
    ket_thuc_nghi TIMESTAMP
);

-- 10. Bảng Điểm Chấm Công
CREATE TABLE DIEM_CHAM_CONG (
    id_diem_cham_cong VARCHAR(8) PRIMARY KEY,
    kinh_do DECIMAL(10, 6),
    vi_do DECIMAL(10, 6),
    ten_wifi VARCHAR(255),
    dia_chi_wifi VARCHAR(255)
);

-- 11. Bảng Chấm Công
CREATE TABLE CHAM_CONG (
    id_cham_cong VARCHAR(8) PRIMARY KEY,
    id_nhan_vien VARCHAR(8),
    id_ca_lam VARCHAR(8),
    id_diem_cham_cong VARCHAR(8),
    ten_wifi VARCHAR(255),
    dia_chi_wifi VARCHAR(255),
    kinh_do DECIMAL(10, 6),
    vi_do DECIMAL(10, 6),
    gio_vao TIMESTAMP,
    gio_ra TIMESTAMP,
    url_anh VARCHAR(255),
    ghi_chu VARCHAR(255)
);

-- 12. Bảng Văn Phòng
CREATE TABLE VAN_PHONG (
    id_van_phong VARCHAR(8) PRIMARY KEY,
    ten_van_phong VARCHAR(255), 
    dia_chi VARCHAR(255),
    kinh_do DECIMAL(10, 6),
    vi_do DECIMAL(10, 6),
    pham_vi NUMERIC
);

-- 13. Bảng WiFi
CREATE TABLE WIFI (
    id_wifi VARCHAR(8) PRIMARY KEY,
    ten_wifi VARCHAR(255),
    dia_chi_wifi VARCHAR(255),
    id_van_phong VARCHAR(8)
);

-- ========================================================
-- PHẦN 2: TẠO CÁC RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEYS)
-- ========================================================

-- Vai trò & Quyền hạn
ALTER TABLE VAI_TRO 
ADD CONSTRAINT FK_VaiTro_NguoiDung FOREIGN KEY (id_nguoi_dung) REFERENCES TAI_KHOAN(id_tai_khoan);

ALTER TABLE VAI_TRO_QUYEN_HAN 
ADD CONSTRAINT FK_VTQH_VaiTro FOREIGN KEY (id_vai_tro) REFERENCES VAI_TRO(id_vai_tro);

ALTER TABLE VAI_TRO_QUYEN_HAN 
ADD CONSTRAINT FK_VTQH_Quyen FOREIGN KEY (id_quyen) REFERENCES QUYEN(id_quyen);

-- Tài khoản
ALTER TABLE TAI_KHOAN 
ADD CONSTRAINT FK_TaiKhoan_VaiTro FOREIGN KEY (id_vai_tro) REFERENCES VAI_TRO(id_vai_tro);

-- Phòng ban
ALTER TABLE PHONG_BAN 
ADD CONSTRAINT FK_PhongBan_NguoiDung FOREIGN KEY (id_nguoi_dung) REFERENCES TAI_KHOAN(id_tai_khoan);

-- Nhân viên
ALTER TABLE NHAN_VIEN 
ADD CONSTRAINT FK_NhanVien_TaiKhoan FOREIGN KEY (id_tai_khoan) REFERENCES TAI_KHOAN(id_tai_khoan);

ALTER TABLE NHAN_VIEN 
ADD CONSTRAINT FK_NhanVien_PhongBan FOREIGN KEY (id_phong_ban) REFERENCES PHONG_BAN(id_phong_ban);

-- Đơn xin nghỉ
ALTER TABLE DON_XIN_NGHI 
ADD CONSTRAINT FK_DonXinNghi_NhanVien FOREIGN KEY (id_nguoi_dung) REFERENCES NHAN_VIEN(id_nhan_vien);

ALTER TABLE DON_XIN_NGHI 
ADD CONSTRAINT FK_DonXinNghi_NguoiDuyet FOREIGN KEY (id_nguoi_duyet) REFERENCES NHAN_VIEN(id_nhan_vien);

ALTER TABLE DON_XIN_NGHI 
ADD CONSTRAINT FK_DonXinNghi_LoaiPhep FOREIGN KEY (id_loai_phep) REFERENCES LOAI_PHEP(id_loai_phep);

-- Chấm công
ALTER TABLE CHAM_CONG 
ADD CONSTRAINT FK_ChamCong_NhanVien FOREIGN KEY (id_nhan_vien) REFERENCES NHAN_VIEN(id_nhan_vien);

ALTER TABLE CHAM_CONG 
ADD CONSTRAINT FK_ChamCong_CaLamViec FOREIGN KEY (id_ca_lam) REFERENCES CA_LAM_VIEC(id_ca_lam_viec);

ALTER TABLE CHAM_CONG 
ADD CONSTRAINT FK_ChamCong_DiemChamCong FOREIGN KEY (id_diem_cham_cong) REFERENCES DIEM_CHAM_CONG(id_diem_cham_cong);

-- WiFi
ALTER TABLE WIFI 
ADD CONSTRAINT FK_WiFi_VanPhong FOREIGN KEY (id_van_phong) REFERENCES VAN_PHONG(id_van_phong);

-- ========================================================
-- PHẦN 3: DỮ LIỆU MẪU (SAMPLE DATA)
-- ========================================================

-- 1. Bảng Quyền
INSERT INTO QUYEN (id_quyen, ten_quyen, mo_ta) VALUES
('Q001', 'Toàn quyền', 'Quản trị viên hệ thống'),
('Q002', 'Chấm công', 'Quyền chấm công hàng ngày'),
('Q003', 'Quản lý nhân sự', 'Quyền quản lý nhân sự'),
('Q004', 'Xem báo cáo', 'Quản lý và xem báo cáo');

-- 2. Bảng Vai Trò (Tạm để id_nguoi_dung là NULL do chưa có dữ liệu User)
INSERT INTO VAI_TRO (id_vai_tro, ten_vai_tro, mo_ta, ngay_tao, id_nguoi_dung) VALUES
('VT001', 'Admin', 'Quản trị viên toàn hệ thống', '2026-01-01 00:00:00', NULL),
('VT002', 'HR', 'Trưởng phòng nhân sự', '2026-01-01 00:00:00', NULL),
('VT003', 'Nhân viên', 'Nhân viên bình thường', '2026-01-01 00:00:00', NULL);

-- 3. Bảng Vai Trò - Quyền Hạn
INSERT INTO VAI_TRO_QUYEN_HAN (id_vai_tro, id_quyen) VALUES
('VT001', 'Q001'),
('VT002', 'Q003'),
('VT002', 'Q004'),
('VT003', 'Q002');

-- 4. Bảng Tài Khoản (mật khẩu mặc định 123456 - trong thực tế sẽ băm)
INSERT INTO TAI_KHOAN (id_tai_khoan, ten_dang_nhap, mat_khau, id_vai_tro, trang_thai, ngay_tao) VALUES
('TK001', 'admin', '123456', 'VT001', TRUE, '2026-01-01 00:00:00'),
('TK002', 'hr01', '123456', 'VT002', TRUE, '2026-01-01 00:00:00'),
('TK003', 'nv01', '123456', 'VT003', TRUE, '2026-01-01 00:00:00'),
('TK004', 'nv02', '123456', 'VT003', TRUE, '2026-01-01 00:00:00');

-- Cập nhật lại id_nguoi_dung cho Vai Trò sau khi đã có Tài Khoản
UPDATE VAI_TRO SET id_nguoi_dung = 'TK001' WHERE id_vai_tro = 'VT001';
UPDATE VAI_TRO SET id_nguoi_dung = 'TK001' WHERE id_vai_tro = 'VT002';
UPDATE VAI_TRO SET id_nguoi_dung = 'TK001' WHERE id_vai_tro = 'VT003';

-- 5. Bảng Phòng Ban
INSERT INTO PHONG_BAN (id_phong_ban, ten_phong_ban, mo_ta, id_nguoi_dung, ngay_tao) VALUES
('PB001', 'Ban Giám Đốc', 'Phòng điều hành và ra quyết định', 'TK001', '2026-01-01 00:00:00'),
('PB002', 'Phòng Nhân Sự', 'Quản lý nhân sự, tuyển dụng, lương', 'TK001', '2026-01-01 00:00:00'),
('PB003', 'Phòng Kỹ Thuật', 'Phát triển phần mềm và duy trì hệ thống', 'TK001', '2026-01-01 00:00:00');

-- 6. Bảng Nhân Viên
INSERT INTO NHAN_VIEN (id_nhan_vien, ho_va_ten, ngay_sinh, so_dien_thoai, dia_chi, du_lieu_khuon_mat, id_tai_khoan, id_phong_ban) VALUES
('NV001', 'Nguyễn Văn An', '1985-05-15', '0901234567', '123 Nguyễn Văn Cừ, Quận 5, TP.HCM', NULL, 'TK001', 'PB001'),
('NV002', 'Trần Thị Bích', '1992-08-20', '0912345678', '456 Lê Lợi, Quận 1, TP.HCM', NULL, 'TK002', 'PB002'),
('NV003', 'Lê Văn Cường', '1995-10-10', '0923456789', '789 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM', NULL, 'TK003', 'PB003'),
('NV004', 'Phạm Thị Dung', '1996-12-05', '0934567890', '101 Nguyễn Trãi, Quận A, TP.HN', NULL, 'TK004', 'PB003');

-- 7. Bảng Loại Phép
INSERT INTO LOAI_PHEP (id_loai_phep, ten_phep, so_ngay_toi_da, co_luong, mo_ta) VALUES
('LP001', 'Nghỉ phép năm', 12, TRUE, 'Nghỉ phép theo quy định của pháp luật'),
('LP002', 'Nghỉ đau ốm', 30, FALSE, 'Nghỉ do đau ốm (có giấy hẹn khám/bệnh)'),
('LP003', 'Nghỉ thai sản', 180, TRUE, 'Nghỉ thai sản theo độ lao động');

-- 8. Bảng Đơn Xin Nghỉ
INSERT INTO DON_XIN_NGHI (id_don_xin_nghi, id_nguoi_dung, id_loai_phep, ngay_bat_dau, ngay_ket_thuc, ly_do, trang_thai, id_nguoi_duyet, ngay_duyet, ngay_tao, ghi_chu) VALUES
('DN001', 'NV003', 'LP001', '2026-05-01', '2026-05-02', 'Xử lý việc gia đình', TRUE, 'NV002', '2026-04-28 10:00:00', '2026-04-25 09:00:00', 'Được duyệt'),
('DN002', 'NV004', 'LP002', '2026-06-15', '2026-06-16', 'Bị cảm mệt không thể đi làm', FALSE, NULL, NULL, '2026-06-14 15:00:00', 'Chờ quản lý duyệt');

-- 9. Bảng Ca Làm Việc
INSERT INTO CA_LAM_VIEC (id_ca_lam_viec, ten_ca, gio_vao, gio_ra, phut_cho_phep_tre, so_cong, nghi_trua, bat_dau_nghi, ket_thuc_nghi) VALUES
('CA001', 'Ca Hành Chính', '2026-01-01 08:00:00', '2026-01-01 17:30:00', 15, 1.0, TRUE, '2026-01-01 12:00:00', '2026-01-01 13:30:00'),
('CA002', 'Ca Sáng', '2026-01-01 06:00:00', '2026-01-01 14:00:00', 10, 1.0, TRUE, '2026-01-01 10:00:00', '2026-01-01 10:30:00'),
('CA003', 'Ca Chiều', '2026-01-01 14:00:00', '2026-01-01 22:00:00', 10, 1.0, TRUE, '2026-01-01 18:00:00', '2026-01-01 18:30:00');

-- 10. Bảng Văn Phòng
INSERT INTO VAN_PHONG (id_van_phong, ten_van_phong, dia_chi, kinh_do, vi_do, pham_vi) VALUES
('VP001', 'Trụ Sở Chính (HCM)', '123 Nguyễn Văn Cừ, Quận 5, TP.HCM', 106.682172, 10.762622, 100),
('VP002', 'Chi Nhánh Hà Nội', '456 Lê Lợi, Hoàn Kiếm, Hà Nội', 105.852100, 21.028511, 50);

-- 11. Bảng WiFi
INSERT INTO WIFI (id_wifi, ten_wifi, dia_chi_wifi, id_van_phong) VALUES
('WF001', 'CTY_Tầng_1', '00:1A:2B:3C:4D:5E', 'VP001'),
('WF002', 'CTY_Tầng_2', 'AA:BB:CC:DD:EE:FF', 'VP001'),
('WF003', 'HN_Branch_Wifi', '11:22:33:44:55:66', 'VP002');

-- 12. Bảng Điểm Chấm Công (Lưu các lần lấy tọa độ/wifi thành công khi nhân viên bấm chấm công)
INSERT INTO DIEM_CHAM_CONG (id_diem_cham_cong, kinh_do, vi_do, ten_wifi, dia_chi_wifi) VALUES
('DC001', 106.682170, 10.762620, 'CTY_Tầng_1', '00:1A:2B:3C:4D:5E'),
('DC002', 106.682175, 10.762625, 'CTY_Tầng_2', 'AA:BB:CC:DD:EE:FF'),
('DC003', 105.852101, 21.028512, 'HN_Branch_Wifi', '11:22:33:44:55:66');

-- 13. Bảng Chấm Công
INSERT INTO CHAM_CONG (id_cham_cong, id_nhan_vien, id_ca_lam, id_diem_cham_cong, ten_wifi, dia_chi_wifi, kinh_do, vi_do, gio_vao, gio_ra, url_anh, ghi_chu) VALUES
('CC001', 'NV003', 'CA001', 'DC001', 'CTY_Tầng_1', '00:1A:2B:3C:4D:5E', 106.682170, 10.762620, '2026-04-15 07:50:00', '2026-04-15 17:35:00', NULL, 'Đi làm đúng giờ'),
('CC002', 'NV004', 'CA001', 'DC002', 'CTY_Tầng_2', 'AA:BB:CC:DD:EE:FF', 106.682175, 10.762625, '2026-04-15 08:05:00', '2026-04-15 17:30:00', NULL, 'Đi trễ 5 phút'),
('CC003', 'NV001', 'CA002', 'DC003', 'HN_Branch_Wifi', '11:22:33:44:55:66', 105.852101, 21.028512, '2026-04-15 05:55:00', '2026-04-15 14:05:00', NULL, 'Sếp đi làm sớm');