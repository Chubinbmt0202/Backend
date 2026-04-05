
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

CREATE TABLE VAI_TRO (
    id_vai_tro VARCHAR(8) PRIMARY KEY,
    ten_vai_tro VARCHAR(255),
    mo_ta VARCHAR(255)
);

CREATE TABLE QUYEN (
    id_quyen VARCHAR(8) PRIMARY KEY,
    ten_quyen VARCHAR(255),
    ma_quyen VARCHAR(10),
    mo_ta VARCHAR(255)
);

CREATE TABLE VAI_TRO_QUYEN_HAN (
    id_vai_tro VARCHAR(8),
    id_quyen VARCHAR(8),
    PRIMARY KEY (id_vai_tro, id_quyen)
);

CREATE TABLE TAI_KHOAN (
    id_tai_khoan VARCHAR(8) PRIMARY KEY,
    ten_dang_nhap VARCHAR(255),
    mat_khau VARCHAR(255),
    id_vai_tro VARCHAR(8),
    trang_thai BOOLEAN,
    ngay_tao TIMESTAMP
);

CREATE TABLE PHONG_BAN (
    id_phong_ban VARCHAR(8) PRIMARY KEY,
    mo_ta VARCHAR(255),
    ngay_tao TIMESTAMP,
    id_nguoi_dung VARCHAR(8)
);

CREATE TABLE NHAN_VIEN (
    id_nhan_vien VARCHAR(8) PRIMARY KEY,
    ho_va_ten VARCHAR(255),
    ngay_sinh TIMESTAMP,
    so_dien_thoai VARCHAR(10),
    dia_chi VARCHAR(255),
    du_lieu_khuon_mat JSONB,
    id_tai_khoan VARCHAR(8),
    id_phong_ban VARCHAR(8)
);

CREATE TABLE LOAI_PHEP (
    id_loai_phep VARCHAR(8) PRIMARY KEY,
    ten_phep VARCHAR(255),
    so_ngay_toi_da NUMERIC,
    co_luong BOOLEAN,
    mo_ta TEXT
);

CREATE TABLE DON_XIN_NGHI (
    id_don_xin_nghi VARCHAR(8) PRIMARY KEY,
    id_nguoi_dung VARCHAR(8),
    id_loai_phep VARCHAR(8),
    ngay_bat_dau TIMESTAMP,
    ngay_ket_thuc TIMESTAMP,
    ly_do VARCHAR(255),
    trang_thai BOOLEAN,
    id_nguoi_duyet VARCHAR(8),
    ngay_tao TIMESTAMP,
    ngay_duyet TIMESTAMP,
    ghi_chu VARCHAR(255)
);

CREATE TABLE CA_LAM_VIEC (
    id_ca_lam VARCHAR(8) PRIMARY KEY,
    ten_ca VARCHAR(255),
    gio_vao TIMESTAMP,
    gio_ra TIMESTAMP,
    phut_cho_phep_tre NUMERIC,
    so_cong REAL,
    nghi_trua BOOLEAN,
    bat_dau_nghi TIMESTAMP,
    ket_thuc_nghi TIMESTAMP
);

CREATE TABLE VAN_PHONG (
    id_van_phong VARCHAR(8) PRIMARY KEY,
    ten VARCHAR(255),
    dia_chi VARCHAR(255),
    kinh_do DECIMAL,
    vi_do DECIMAL,
    pham_vi NUMERIC
);

CREATE TABLE DIEM_CHAM_CONG (
    id_diem_cham_cong VARCHAR(8) PRIMARY KEY,
    vi_do DECIMAL,
    kinh_do DECIMAL,
    ssid VARCHAR(255),
    bssid VARCHAR(255),
    id_van_phong VARCHAR(8)
);

CREATE TABLE CHAM_CONG (
    id_cham_cong VARCHAR(8) PRIMARY KEY,
    id_nhan_vien VARCHAR(8),
    id_ca_lam_viec VARCHAR(8),
    thoi_gian TIMESTAMP,
    id_diem_cham_cong VARCHAR(8),
    ten_wifi VARCHAR(255),
    dia_chi_wifi VARCHAR(255),
    vi_do DECIMAL,
    kinh_do DECIMAL,
    anh_url VARCHAR(255),
    ghi_chu VARCHAR(255)
);

CREATE TABLE WIFI_VAN_PHONG (
    id_wifi VARCHAR(8) PRIMARY KEY,
    ten_wifi VARCHAR(255),
    dia_chi_mac VARCHAR(255),
    id_van_phong VARCHAR(8)
);


-- ========================================================
-- 2. THIẾT LẬP CÁC KHÓA NGOẠI (FOREIGN KEYS)
-- ========================================================

-- Liên kết VAI_TRO_QUYEN_HAN
ALTER TABLE VAI_TRO_QUYEN_HAN 
    ADD CONSTRAINT fk_vtqh_vaitro FOREIGN KEY (id_vai_tro) REFERENCES VAI_TRO(id_vai_tro),
    ADD CONSTRAINT fk_vtqh_quyen FOREIGN KEY (id_quyen) REFERENCES QUYEN(id_quyen);

-- Liên kết TAI_KHOAN -> VAI_TRO
ALTER TABLE TAI_KHOAN 
    ADD CONSTRAINT fk_taikhoan_vaitro FOREIGN KEY (id_vai_tro) REFERENCES VAI_TRO(id_vai_tro);

-- Liên kết NHAN_VIEN -> TAI_KHOAN & PHONG_BAN
ALTER TABLE NHAN_VIEN 
    ADD CONSTRAINT fk_nhanvien_taikhoan FOREIGN KEY (id_tai_khoan) REFERENCES TAI_KHOAN(id_tai_khoan),
    ADD CONSTRAINT fk_nhanvien_phongban FOREIGN KEY (id_phong_ban) REFERENCES PHONG_BAN(id_phong_ban);

-- Liên kết PHONG_BAN -> NHAN_VIEN (Người quản lý phòng ban)
ALTER TABLE PHONG_BAN 
    ADD CONSTRAINT fk_phongban_nguoidung FOREIGN KEY (id_nguoi_dung) REFERENCES NHAN_VIEN(id_nhan_vien);

-- Liên kết DON_XIN_NGHI
ALTER TABLE DON_XIN_NGHI 
    ADD CONSTRAINT fk_dxn_nguoidung FOREIGN KEY (id_nguoi_dung) REFERENCES NHAN_VIEN(id_nhan_vien),
    ADD CONSTRAINT fk_dxn_nguoiduyet FOREIGN KEY (id_nguoi_duyet) REFERENCES NHAN_VIEN(id_nhan_vien),
    ADD CONSTRAINT fk_dxn_loaiphep FOREIGN KEY (id_loai_phep) REFERENCES LOAI_PHEP(id_loai_phep);

-- Liên kết DIEM_CHAM_CONG -> VAN_PHONG
ALTER TABLE DIEM_CHAM_CONG 
    ADD CONSTRAINT fk_dcc_vanphong FOREIGN KEY (id_van_phong) REFERENCES VAN_PHONG(id_van_phong);

-- Liên kết WIFI_VAN_PHONG -> VAN_PHONG
ALTER TABLE WIFI_VAN_PHONG 
    ADD CONSTRAINT fk_wvp_vanphong FOREIGN KEY (id_van_phong) REFERENCES VAN_PHONG(id_van_phong) ON DELETE CASCADE;

-- Liên kết CHAM_CONG
ALTER TABLE CHAM_CONG 
    ADD CONSTRAINT fk_cc_nhanvien FOREIGN KEY (id_nhan_vien) REFERENCES NHAN_VIEN(id_nhan_vien),
    ADD CONSTRAINT fk_cc_calamviec FOREIGN KEY (id_ca_lam_viec) REFERENCES CA_LAM_VIEC(id_ca_lam),
    ADD CONSTRAINT fk_cc_diemchamcong FOREIGN KEY (id_diem_cham_cong) REFERENCES DIEM_CHAM_CONG(id_diem_cham_cong);

-- ========================================================
-- 3. DỮ LIỆU MẪU (DUMMY DATA)
-- ========================================================

INSERT INTO VAI_TRO (id_vai_tro, ten_vai_tro, mo_ta) VALUES
('VT001', 'Admin', 'Quản trị viên hệ thống'),
('VT002', 'Manager', 'Quản lý phòng ban'),
('VT003', 'Employee', 'Nhân viên thông thường');

INSERT INTO QUYEN (id_quyen, ten_quyen, ma_quyen, mo_ta) VALUES
('Q001', 'Quản lý nhân sự', 'HR_MGR', 'Quyền thêm/sửa/xóa nhân viên'),
('Q002', 'Duyệt đơn nghỉ', 'LEAVE_APP', 'Quyền duyệt đơn xin nghỉ'),
('Q003', 'Chấm công', 'ATTEND', 'Quyền xem và xuất dữ liệu chấm công');

INSERT INTO VAI_TRO_QUYEN_HAN (id_vai_tro, id_quyen) VALUES
('VT001', 'Q001'), ('VT001', 'Q002'), ('VT001', 'Q003'),
('VT002', 'Q002'), ('VT002', 'Q003');

INSERT INTO TAI_KHOAN (id_tai_khoan, ten_dang_nhap, mat_khau, id_vai_tro, trang_thai, ngay_tao) VALUES
('TK001', 'admin', '123456', 'VT001', TRUE, CURRENT_TIMESTAMP),
('TK002', 'manager1', '123456', 'VT002', TRUE, CURRENT_TIMESTAMP),
('TK003', 'emp1', '123456', 'VT003', TRUE, CURRENT_TIMESTAMP);

-- Thêm phòng ban trước với id_nguoi_dung = NULL để tránh lỗi vòng lặp khóa ngoại
INSERT INTO PHONG_BAN (id_phong_ban, mo_ta, ngay_tao, id_nguoi_dung) VALUES
('PB001', 'Phòng Hành chính Nhân sự', CURRENT_TIMESTAMP, NULL),
('PB002', 'Phòng Kỹ thuật', CURRENT_TIMESTAMP, NULL);

INSERT INTO NHAN_VIEN (id_nhan_vien, ho_va_ten, ngay_sinh, so_dien_thoai, dia_chi, du_lieu_khuon_mat, id_tai_khoan, id_phong_ban) VALUES
('NV001', 'Nguyễn Văn Admin', '1990-01-01', '0901234567', 'Hà Nội', '{}', 'TK001', 'PB001'),
('NV002', 'Trần Thị Quản Lý', '1992-05-10', '0912345678', 'Đà Nẵng', '{}', 'TK002', 'PB002'),
('NV003', 'Lê Văn Nhân Viên', '1995-10-20', '0923456789', 'TP HCM', '{}', 'TK003', 'PB002');

-- Cập nhật lại id_nguoi_dung (Trưởng phòng) cho PHONG_BAN
UPDATE PHONG_BAN SET id_nguoi_dung = 'NV001' WHERE id_phong_ban = 'PB001';
UPDATE PHONG_BAN SET id_nguoi_dung = 'NV002' WHERE id_phong_ban = 'PB002';

INSERT INTO LOAI_PHEP (id_loai_phep, ten_phep, so_ngay_toi_da, co_luong, mo_ta) VALUES
('LP001', 'Nghỉ phép năm', 12, TRUE, 'Nghỉ phép hằng năm có lương'),
('LP002', 'Nghỉ ốm', 5, FALSE, 'Nghỉ ốm theo quy định'),
('LP003', 'Nghỉ không lương', 30, FALSE, 'Nghỉ việc riêng không hưởng lương');

INSERT INTO DON_XIN_NGHI (id_don_xin_nghi, id_nguoi_dung, id_loai_phep, ngay_bat_dau, ngay_ket_thuc, ly_do, trang_thai, id_nguoi_duyet, ngay_tao, ngay_duyet, ghi_chu) VALUES
('DXN001', 'NV003', 'LP001', '2026-05-01 08:00:00', '2026-05-02 17:00:00', 'Về quê', TRUE, 'NV002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Đã duyệt'),
('DXN002', 'NV003', 'LP002', '2026-06-10 08:00:00', '2026-06-11 17:00:00', 'Bệnh', FALSE, NULL, CURRENT_TIMESTAMP, NULL, 'Chờ duyệt');

INSERT INTO CA_LAM_VIEC (id_ca_lam, ten_ca, gio_vao, gio_ra, phut_cho_phep_tre, so_cong, nghi_trua, bat_dau_nghi, ket_thuc_nghi) VALUES
('CA001', 'Ca Hành chính', '2000-01-01 08:00:00', '2000-01-01 17:00:00', 15, 1.0, TRUE, '2000-01-01 12:00:00', '2000-01-01 13:00:00'),
('CA002', 'Ca Sáng', '2000-01-01 08:00:00', '2000-01-01 12:00:00', 15, 0.5, FALSE, NULL, NULL),
('CA003', 'Ca Chiều', '2000-01-01 13:00:00', '2000-01-01 17:00:00', 15, 0.5, FALSE, NULL, NULL);

INSERT INTO VAN_PHONG (id_van_phong, ten, dia_chi, kinh_do, vi_do, pham_vi) VALUES
('VP001', 'Trụ sở chính', 'Quận 1, TP HCM', 106.6953, 10.7766, 50);

INSERT INTO WIFI_VAN_PHONG (id_wifi, ten_wifi, dia_chi_mac, id_van_phong) VALUES
('WF000001', 'Office_Wifi_T1', '00:11:22:33:44:55', 'VP001'),
('WF000002', 'Office_Wifi_T2', '66:77:88:99:AA:BB', 'VP001');

INSERT INTO DIEM_CHAM_CONG (id_diem_cham_cong, vi_do, kinh_do, ssid, bssid, id_van_phong) VALUES
('DCC001', 10.7766, 106.6953, 'Office_Wifi', '00:11:22:33:44:55', 'VP001');

INSERT INTO CHAM_CONG (id_cham_cong, id_nhan_vien, id_ca_lam_viec, thoi_gian, id_diem_cham_cong, ten_wifi, dia_chi_wifi, vi_do, kinh_do, anh_url, ghi_chu) VALUES
('CC001', 'NV003', 'CA001', CURRENT_TIMESTAMP, 'DCC001', 'Office_Wifi', '00:11:22:33:44:55', 10.7766, 106.6953, 'url_image1.jpg', 'Chấm công vào'),
('CC002', 'NV002', 'CA001', CURRENT_TIMESTAMP, 'DCC001', 'Office_Wifi', '00:11:22:33:44:55', 10.7766, 106.6953, 'url_image2.jpg', 'Chấm công vào');