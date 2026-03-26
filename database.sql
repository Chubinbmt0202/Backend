
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
DROP TABLE IF EXISTS WIFI CASCADE;
DROP TABLE IF EXISTS GPS CASCADE;
DROP TABLE IF EXISTS VAN_PHONG CASCADE;

-- ============================================================
-- 1. QUYEN (Quyền hạn)
-- ============================================================
CREATE TABLE QUYEN (
    id_quyen    SERIAL PRIMARY KEY,
    ten_quyen   VARCHAR(255) NOT NULL,
    ma_quyen    VARCHAR(10)  NOT NULL UNIQUE,
    mo_ta       VARCHAR(255)
);

-- ============================================================
-- 2. VAI_TRO (Vai trò)
-- ============================================================
CREATE TABLE VAI_TRO (
    id_vai_tro  SERIAL PRIMARY KEY,
    ten_vai_tro VARCHAR(255) NOT NULL,
    mo_ta       VARCHAR(255)
);

-- ============================================================
-- 3. VAI_TRO_QUYEN_HAN (Bảng trung gian: Vai trò - Quyền)
-- ============================================================
CREATE TABLE VAI_TRO_QUYEN_HAN (
    id_vai_tro  INT NOT NULL REFERENCES VAI_TRO(id_vai_tro) ON DELETE CASCADE,
    id_quyen    INT NOT NULL REFERENCES QUYEN(id_quyen) ON DELETE CASCADE,
    PRIMARY KEY (id_vai_tro, id_quyen)
);

-- ============================================================
-- 4. TAI_KHOAN (Tài khoản đăng nhập)
-- ============================================================
CREATE TABLE TAI_KHOAN (
    id_tai_khoan    SERIAL PRIMARY KEY,
    ten_dang_nhap   VARCHAR(255) NOT NULL UNIQUE,
    mat_khau        VARCHAR(255) NOT NULL,          -- nên lưu dạng hash (bcrypt)
    id_vai_tro      INT REFERENCES VAI_TRO(id_vai_tro) ON DELETE SET NULL,
    trang_thai      BOOLEAN NOT NULL DEFAULT TRUE,   -- TRUE = active
    ngay_tao        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. VAN_PHONG (Văn phòng)
-- ============================================================
CREATE TABLE VAN_PHONG (
    id_van_phong    SERIAL PRIMARY KEY,
    ten             VARCHAR(255) NOT NULL,
    dia_chi         VARCHAR(255)
);

-- ============================================================
-- 6. PHONG_BAN (Phòng ban)
-- ============================================================
CREATE TABLE PHONG_BAN (
    id_phong_ban    SERIAL PRIMARY KEY,
    mo_ta           VARCHAR(255),
    ngay_tao        TIMESTAMP NOT NULL DEFAULT NOW(),
    id_nguoi_dung   INT          -- Trưởng phòng (tham chiếu tới NHAN_VIEN, thêm FK sau)
);

-- ============================================================
-- 7. NHAN_VIEN (Nhân viên)
-- ============================================================
CREATE TABLE NHAN_VIEN (
    id_nhan_vien        SERIAL PRIMARY KEY,
    ho_va_ten           VARCHAR(255) NOT NULL,
    ngay_sinh           DATE,
    so_dien_thoai       VARCHAR(20),
    dia_chi             VARCHAR(255),
    du_lieu_khuon_mat   JSONB,                       -- dữ liệu nhận diện khuôn mặt
    id_tai_khoan        INT UNIQUE REFERENCES TAI_KHOAN(id_tai_khoan) ON DELETE SET NULL,
    id_phong_ban        INT REFERENCES PHONG_BAN(id_phong_ban) ON DELETE SET NULL
);

-- Thêm FK ngược: Phòng ban -> Trưởng phòng (NHAN_VIEN)
ALTER TABLE PHONG_BAN
    ADD CONSTRAINT fk_phong_ban_nguoi_dung
    FOREIGN KEY (id_nguoi_dung) REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE SET NULL;

-- ============================================================
-- 8. LOAI_PHEP (Loại nghỉ phép)
-- ============================================================
CREATE TABLE LOAI_PHEP (
    id_loai_phep    SERIAL PRIMARY KEY,
    ten_phep        VARCHAR(255) NOT NULL,
    so_ngay_toi_da  NUMERIC(5,1),
    co_luong        BOOLEAN NOT NULL DEFAULT TRUE,
    mo_ta           TEXT
);

-- ============================================================
-- 9. DON_XIN_NGHI (Đơn xin nghỉ)
-- ============================================================
CREATE TABLE DON_XIN_NGHI (
    id_don_xin_nghi SERIAL PRIMARY KEY,
    id_nguoi_dung   INT NOT NULL REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE CASCADE,
    id_loai_phep    INT REFERENCES LOAI_PHEP(id_loai_phep) ON DELETE SET NULL,
    ngay_bat_dau    DATE NOT NULL,
    ngay_ket_thuc   DATE NOT NULL,
    ly_do           VARCHAR(255),
    trang_thai      BOOLEAN NOT NULL DEFAULT FALSE,  -- FALSE = chờ duyệt, TRUE = đã duyệt
    id_nguoi_duyet  INT REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE SET NULL,
    ngay_tao        TIMESTAMP NOT NULL DEFAULT NOW(),
    ngay_duyet      TIMESTAMP,
    ghi_chu         VARCHAR(255),
    CONSTRAINT chk_ngay CHECK (ngay_ket_thuc >= ngay_bat_dau)
);

-- ============================================================
-- 10. CA_LAM_VIEC (Ca làm việc)
-- ============================================================
CREATE TABLE CA_LAM_VIEC (
    id_ca_lam       SERIAL PRIMARY KEY,
    ten_ca          VARCHAR(255) NOT NULL,
    gio_vao         TIME NOT NULL,
    gio_ra          TIME NOT NULL,
    phut_cho_phep_tre INT NOT NULL DEFAULT 0,        -- phút trễ được phép
    so_cong         NUMERIC(4,2) NOT NULL DEFAULT 1, -- hệ số công
    nghi_trua       BOOLEAN NOT NULL DEFAULT TRUE,
    bat_dau_nghi    TIME,                            -- giờ bắt đầu nghỉ trưa
    ket_thuc_nghi   TIME,                            -- giờ kết thúc nghỉ trưa
    CONSTRAINT chk_ca CHECK (gio_ra > gio_vao)
);

-- ============================================================
-- 11. DIEM_CHAM_CONG (Điểm chấm công GPS/Wifi)
-- ============================================================
CREATE TABLE DIEM_CHAM_CONG (
    id_diem_cham_cong   SERIAL PRIMARY KEY,
    vi_do               DECIMAL(10, 7),
    kinh_do             DECIMAL(10, 7),
    ssid                VARCHAR(255),
    bssid               VARCHAR(255),
    id_van_phong        INT REFERENCES VAN_PHONG(id_van_phong) ON DELETE SET NULL
);

-- ============================================================
-- 12. CHAM_CONG (Bảng chấm công)
-- ============================================================
CREATE TABLE CHAM_CONG (
    id_cham_cong        SERIAL PRIMARY KEY,
    id_nhan_vien        INT NOT NULL REFERENCES NHAN_VIEN(id_nhan_vien) ON DELETE CASCADE,
    id_ca_lam_viec      INT REFERENCES CA_LAM_VIEC(id_ca_lam) ON DELETE SET NULL,
    thoi_gian           TIMESTAMP NOT NULL DEFAULT NOW(),
    id_diem_cham_Cong   INT REFERENCES DIEM_CHAM_CONG(id_diem_cham_cong) ON DELETE SET NULL,
    wifi_ssid           VARCHAR(255),
    wifi_bssid          VARCHAR(255),
    vi_do               DECIMAL(10, 7),
    kinh_do             DECIMAL(10, 7),
    anh_url             TEXT,                        -- URL ảnh chụp khi chấm công
    ghi_chu             VARCHAR(255)
);

-- ============================================================
-- 13. WIFI (Danh sách Wifi được phép chấm công)
-- ============================================================
CREATE TABLE WIFI (
    id_wifi         SERIAL PRIMARY KEY,
    ssid            VARCHAR(255) NOT NULL,
    bssid           VARCHAR(255) NOT NULL,
    id_van_phong    INT REFERENCES VAN_PHONG(id_van_phong) ON DELETE CASCADE,
    UNIQUE (bssid, id_van_phong)
);

-- ============================================================
-- 14. GPS (Khu vực GPS được phép chấm công)
-- ============================================================
CREATE TABLE GPS (
    id_gps          SERIAL PRIMARY KEY,
    id_van_phong    INT REFERENCES VAN_PHONG(id_van_phong) ON DELETE CASCADE,
    kinh_do         DECIMAL(10, 7) NOT NULL,
    vi_do           DECIMAL(10, 7) NOT NULL,
    pham_vi         INT NOT NULL DEFAULT 100         -- bán kính (mét)
);

-- ============================================================
-- INDEX để tăng hiệu suất truy vấn
-- ============================================================
CREATE INDEX idx_nhan_vien_phong_ban  ON NHAN_VIEN(id_phong_ban);
CREATE INDEX idx_nhan_vien_tai_khoan  ON NHAN_VIEN(id_tai_khoan);
CREATE INDEX idx_cham_cong_nhan_vien  ON CHAM_CONG(id_nhan_vien);
CREATE INDEX idx_cham_cong_thoi_gian  ON CHAM_CONG(thoi_gian);
CREATE INDEX idx_don_nghi_nguoi_dung  ON DON_XIN_NGHI(id_nguoi_dung);
CREATE INDEX idx_don_nghi_trang_thai  ON DON_XIN_NGHI(trang_thai);
CREATE INDEX idx_tai_khoan_ten        ON TAI_KHOAN(ten_dang_nhap);

-- ============================================================
-- DỮ LIỆU MẪU (Seed Data)
-- ============================================================

-- Quyền
INSERT INTO QUYEN (ten_quyen, ma_quyen, mo_ta) VALUES
    ('Xem nhân viên',       'NV_VIEW',  'Quyền xem danh sách nhân viên'),
    ('Sửa nhân viên',       'NV_EDIT',  'Quyền sửa thông tin nhân viên'),
    ('Duyệt đơn nghỉ',      'DN_DUYET', 'Quyền phê duyệt đơn xin nghỉ'),
    ('Quản trị hệ thống',   'SYS_ADMIN','Toàn quyền hệ thống');

-- Vai trò
INSERT INTO VAI_TRO (ten_vai_tro, mo_ta) VALUES
    ('Admin',       'Quản trị viên hệ thống'),
    ('Quản lý',     'Trưởng/phó phòng'),
    ('Nhân viên',   'Nhân viên thông thường'),
    ('Giám đốc',   'Giám đốc công ty');

-- Gán quyền cho vai trò
INSERT INTO VAI_TRO_QUYEN_HAN (id_vai_tro, id_quyen) VALUES
    (1, 1),(1, 2),(1, 3),(1, 4),  -- Admin: toàn quyền
    (2, 1),(2, 2),(2, 3),          -- Quản lý
    (3, 1);                        -- Nhân viên: chỉ xem

-- Loại phép
INSERT INTO LOAI_PHEP (ten_phep, so_ngay_toi_da, co_luong, mo_ta) VALUES
    ('Nghỉ phép năm',   12,   TRUE,  'Phép năm theo luật lao động'),
    ('Nghỉ ốm',          5,   TRUE,  'Nghỉ ốm có hưởng lương'),
    ('Nghỉ không lương', NULL, FALSE, 'Nghỉ không hưởng lương'),
    ('Nghỉ thai sản',   180,  TRUE,  'Chế độ thai sản');

-- Ca làm việc
INSERT INTO CA_LAM_VIEC (ten_ca, gio_vao, gio_ra, phut_cho_phep_tre, so_cong, nghi_trua, bat_dau_nghi, ket_thuc_nghi) VALUES
    ('Ca hành chính', '08:00', '17:00', 15, 1.0, TRUE,  '12:00', '13:00'),
    ('Ca sáng',       '06:00', '14:00', 10, 1.0, TRUE,  '10:00', '10:30'),
    ('Ca chiều',      '14:00', '22:00', 10, 1.0, FALSE,  NULL,    NULL),
    ('Ca đêm',        '22:00', '06:00', 10, 1.5, FALSE,  NULL,    NULL);

-- Văn phòng
INSERT INTO VAN_PHONG (ten, dia_chi) VALUES
    ('Trụ sở chính', '123 Nguyễn Huệ, Q.1, TP.HCM'),
    ('Chi nhánh HN',  '456 Trần Duy Hưng, Cầu Giấy, Hà Nội');

-- Wifi văn phòng
INSERT INTO WIFI (ssid, bssid, id_van_phong) VALUES
    ('VanPhong_HCM',  'AA:BB:CC:DD:EE:01', 1),
    ('VanPhong_HCM2', 'AA:BB:CC:DD:EE:02', 1),
    ('VanPhong_HN',   'AA:BB:CC:DD:EE:10', 2);

-- GPS văn phòng
INSERT INTO GPS (id_van_phong, kinh_do, vi_do, pham_vi) VALUES
    (1, 106.7009355, 10.7757788, 100),
    (2, 105.7993128, 21.0284834, 100);

-- Điểm chấm công
INSERT INTO DIEM_CHAM_CONG (vi_do, kinh_do, ssid, bssid, id_van_phong) VALUES
    (10.7757788, 106.7009355, 'VanPhong_HCM', 'AA:BB:CC:DD:EE:01', 1),
    (21.0284834, 105.7993128, 'VanPhong_HN',  'AA:BB:CC:DD:EE:10', 2);