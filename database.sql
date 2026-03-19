-- ============================================================
-- SCHEMA TOI GIAN (7-8 BANG) - TIENG VIET KHONG DAU
-- He thong: cham cong, nhan su, quan tri, giam doc
--
-- Luu y:
-- - Ten bang/cot: tieng viet khong dau, snake_case.
-- - Toi gian bang: gom cac nhom chuc nang vao 8 bang chinh.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------- ENUM ----------------
DO $$ BEGIN
  CREATE TYPE vai_tro AS ENUM ('giam_doc', 'can_bo_nhan_su', 'quan_tri_vien', 'nhan_vien');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trang_thai_tai_khoan AS ENUM ('hoat_dong', 'khoa', 'thai_san', 'nghi_viec');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loai_cham_cong AS ENUM ('vao', 'ra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE nguon_cham_cong AS ENUM ('gps', 'wifi', 'qr', 'thu_cong');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trang_thai_don_nghi AS ENUM ('cho_duyet', 'da_duyet', 'tu_choi', 'huy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kenh_thong_bao AS ENUM ('ung_dung', 'email', 'push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1) phong_ban
-- ============================================================
CREATE TABLE IF NOT EXISTS phong_ban (
  id BIGSERIAL PRIMARY KEY,
  ma TEXT UNIQUE,
  ten TEXT NOT NULL,
  phong_ban_cha_id BIGINT REFERENCES phong_ban(id) ON DELETE SET NULL,
  truong_phong_nhan_vien_id BIGINT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2) tai_khoan (users)
-- ============================================================
CREATE TABLE IF NOT EXISTS tai_khoan (
  id BIGSERIAL PRIMARY KEY,
  ten_dang_nhap TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  so_dien_thoai TEXT UNIQUE,
  mat_khau_hash TEXT NOT NULL,
  vai_tro vai_tro NOT NULL DEFAULT 'nhan_vien',
  trang_thai trang_thai_tai_khoan NOT NULL DEFAULT 'hoat_dong',
  lan_dang_nhap_cuoi_luc TIMESTAMPTZ,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3) nhan_vien (employee profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS nhan_vien (
  id BIGSERIAL PRIMARY KEY,
  tai_khoan_id BIGINT UNIQUE REFERENCES tai_khoan(id) ON DELETE SET NULL,
  ma_nhan_vien TEXT UNIQUE NOT NULL,
  ho_ten TEXT NOT NULL,
  ngay_sinh DATE,
  gioi_tinh TEXT,
  dia_chi TEXT,
  chuc_danh TEXT,
  phong_ban_id BIGINT REFERENCES phong_ban(id) ON DELETE SET NULL,
  ngay_vao_lam DATE,
  ngay_nghi_viec DATE,
  du_lieu_khuon_mat JSONB, -- toi gian: gom thong tin khuon mat vao 1 cot
  khuon_mat_da_cap_nhat BOOLEAN NOT NULL DEFAULT FALSE,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE phong_ban
  ADD CONSTRAINT phong_ban_truong_phong_fk
  FOREIGN KEY (truong_phong_nhan_vien_id) REFERENCES nhan_vien(id) ON DELETE SET NULL;

-- ============================================================
-- 4) ca_lam
-- ============================================================
CREATE TABLE IF NOT EXISTS ca_lam (
  id BIGSERIAL PRIMARY KEY,
  ma TEXT UNIQUE NOT NULL,
  ten TEXT NOT NULL,
  gio_bat_dau TIME NOT NULL,
  gio_ket_thuc TIME NOT NULL,
  phut_nghi INT NOT NULL DEFAULT 0,
  phut_cho_tre INT NOT NULL DEFAULT 0,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5) diem_cham_cong (GPS/Wifi)
--    Toi gian: wifi hop le luu trong JSONB (danh sach SSID/BSSID)
-- ============================================================
CREATE TABLE IF NOT EXISTS diem_cham_cong (
  id BIGSERIAL PRIMARY KEY,
  ten TEXT NOT NULL,
  vi_do DOUBLE PRECISION NOT NULL,
  kinh_do DOUBLE PRECISION NOT NULL,
  ban_kinh_met INT NOT NULL DEFAULT 50,
  wifi_cho_phep JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "ssid": "...", "bssid": "..." }]
  dang_hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6) cham_cong (su kien vao/ra)
-- ============================================================
CREATE TABLE IF NOT EXISTS cham_cong (
  id BIGSERIAL PRIMARY KEY,
  nhan_vien_id BIGINT NOT NULL REFERENCES nhan_vien(id) ON DELETE CASCADE,
  loai loai_cham_cong NOT NULL, -- vao/ra
  thoi_gian TIMESTAMPTZ NOT NULL,
  nguon nguon_cham_cong NOT NULL DEFAULT 'gps',
  diem_cham_cong_id BIGINT REFERENCES diem_cham_cong(id) ON DELETE SET NULL,
  wifi_ssid TEXT,
  wifi_bssid TEXT,
  vi_do DOUBLE PRECISION,
  kinh_do DOUBLE PRECISION,
  anh_url TEXT,
  ghi_chu TEXT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cham_cong_nhan_vien_thoi_gian
  ON cham_cong (nhan_vien_id, thoi_gian DESC);

-- ============================================================
-- 7) don_nghi_phep (xin nghi + duyet)
--    Toi gian: gom luong duyet vao cac cot duyet_*
-- ============================================================
CREATE TABLE IF NOT EXISTS don_nghi_phep (
  id BIGSERIAL PRIMARY KEY,
  nhan_vien_id BIGINT NOT NULL REFERENCES nhan_vien(id) ON DELETE CASCADE,
  tu_ngay DATE NOT NULL,
  den_ngay DATE NOT NULL,
  ly_do TEXT,
  trang_thai trang_thai_don_nghi NOT NULL DEFAULT 'cho_duyet',
  nguoi_duyet_tai_khoan_id BIGINT REFERENCES tai_khoan(id) ON DELETE SET NULL,
  duyet_luc TIMESTAMPTZ,
  ghi_chu_duyet TEXT,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now(),
  cap_nhat_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_don_nghi_phep_nhan_vien_ngay
  ON don_nghi_phep (nhan_vien_id, tu_ngay, den_ngay);

-- ============================================================
-- 8) thong_bao
--    Toi gian: nguoi_nhan luu JSONB theo scope
-- ============================================================
CREATE TABLE IF NOT EXISTS thong_bao (
  id BIGSERIAL PRIMARY KEY,
  tieu_de TEXT NOT NULL,
  noi_dung TEXT NOT NULL,
  kenh kenh_thong_bao NOT NULL DEFAULT 'ung_dung',
  nguoi_tao_tai_khoan_id BIGINT REFERENCES tai_khoan(id) ON DELETE SET NULL,
  pham_vi TEXT NOT NULL DEFAULT 'toan_cong_ty' CHECK (pham_vi IN ('toan_cong_ty','phong_ban','vai_tro','danh_sach_tai_khoan')),
  phong_ban_id BIGINT REFERENCES phong_ban(id) ON DELETE SET NULL,
  vai_tro_nhan vai_tro,
  danh_sach_tai_khoan_id JSONB NOT NULL DEFAULT '[]'::jsonb, -- [1,2,3]
  hen_gio_gui_luc TIMESTAMPTZ,
  da_gui_luc TIMESTAMPTZ,
  tao_luc TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------- MO TA (COMMENT) ----------------
COMMENT ON TABLE phong_ban IS 'Danh muc phong ban trong cong ty';
COMMENT ON TABLE tai_khoan IS 'Tai khoan dang nhap he thong + vai tro';
COMMENT ON TABLE nhan_vien IS 'Ho so nhan vien (gan voi tai_khoan neu co)';
COMMENT ON TABLE ca_lam IS 'Cau hinh ca lam (mau)';
COMMENT ON TABLE diem_cham_cong IS 'Cau hinh diem cham cong (GPS/Wifi)';
COMMENT ON TABLE cham_cong IS 'Su kien cham cong vao/ra';
COMMENT ON TABLE don_nghi_phep IS 'Don xin nghi phep + thong tin duyet';
COMMENT ON TABLE thong_bao IS 'Thong bao toan cong ty/phong ban/vai tro/danh sach tai khoan';

COMMIT;

-- ============================================================
-- DU LIEU MAU (SEED) - CO THE CHAY LAI NHIEU LAN
-- Luu y:
-- - Dung id co dinh + ON CONFLICT DO NOTHING de de test.
-- - Mat khau mau: 123456 (bcrypt qua pgcrypto crypt()).
-- ============================================================

BEGIN;

-- 1) phong_ban
INSERT INTO phong_ban (id, ma, ten, phong_ban_cha_id)
VALUES
  (1, 'PB-001', 'Ban Giam Doc', NULL),
  (2, 'PB-002', 'Phong Nhan Su', 1),
  (3, 'PB-003', 'Phong Ky Thuat', 1),
  (4, 'PB-004', 'Phong Ke Toan', 1)
ON CONFLICT DO NOTHING;

-- 2) tai_khoan
INSERT INTO tai_khoan (id, ten_dang_nhap, email, so_dien_thoai, mat_khau_hash, vai_tro, trang_thai, lan_dang_nhap_cuoi_luc)
VALUES
  (1, 'giamdoc', 'giamdoc@congty.vn', '0900000001', crypt('123456', gen_salt('bf')), 'giam_doc', 'hoat_dong', now() - interval '2 days'),
  (2, 'nhansu',  'nhansu@congty.vn',  '0900000002', crypt('123456', gen_salt('bf')), 'can_bo_nhan_su', 'hoat_dong', now() - interval '1 days'),
  (3, 'admin',   'admin@congty.vn',   '0900000003', crypt('123456', gen_salt('bf')), 'quan_tri_vien', 'hoat_dong', now() - interval '3 hours'),
  (4, 'nv001',   'nv001@congty.vn',    '0900000101', crypt('123456', gen_salt('bf')), 'nhan_vien', 'hoat_dong', now() - interval '6 hours'),
  (5, 'nv002',   'nv002@congty.vn',    '0900000102', crypt('123456', gen_salt('bf')), 'nhan_vien', 'hoat_dong', now() - interval '8 hours'),
  (6, 'nv003',   'nv003@congty.vn',    '0900000103', crypt('123456', gen_salt('bf')), 'nhan_vien', 'thai_san', now() - interval '10 days')
ON CONFLICT DO NOTHING;

-- 3) nhan_vien
INSERT INTO nhan_vien (
  id, tai_khoan_id, ma_nhan_vien, ho_ten, ngay_sinh, gioi_tinh, dia_chi, chuc_danh, phong_ban_id, ngay_vao_lam,
  du_lieu_khuon_mat, khuon_mat_da_cap_nhat
)
VALUES
  (1, 1, 'NV-GD-001', 'Nguyen Van A', '1980-01-15', 'Nam', 'TP HCM', 'Giam doc', 1, '2010-05-01', NULL, false),
  (2, 2, 'NV-NS-001', 'Tran Thi B',   '1988-09-20', 'Nu',  'TP HCM', 'Can bo nhan su', 2, '2015-03-10', NULL, false),
  (3, 3, 'NV-AD-001', 'Le Van C',     '1990-12-01', 'Nam', 'TP HCM', 'Quan tri he thong', 3, '2018-07-22', NULL, false),
  (4, 4, 'NV-001',    'Pham Minh D',  '1998-04-18', 'Nam', 'TP HCM', 'Lap trinh vien', 3, '2022-01-05',
    '{"model":"face-api","embedding":[0.01,0.02,0.03,0.04]}'::jsonb, true),
  (5, 5, 'NV-002',    'Vo Thi E',     '1999-11-30', 'Nu',  'TP HCM', 'Ke toan vien', 4, '2023-06-12', NULL, false),
  (6, 6, 'NV-003',    'Doan Thi F',   '1995-02-14', 'Nu',  'TP HCM', 'Nhan vien hanh chinh', 2, '2020-09-01', NULL, false)
ON CONFLICT DO NOTHING;

-- Gan truong_phong_nhan_vien_id cho phong_ban (sau khi co nhan_vien)
UPDATE phong_ban
SET truong_phong_nhan_vien_id = CASE id
  WHEN 1 THEN 1
  WHEN 2 THEN 2
  WHEN 3 THEN 3
  WHEN 4 THEN 5
  ELSE truong_phong_nhan_vien_id
END
WHERE id IN (1,2,3,4);

-- 4) ca_lam
INSERT INTO ca_lam (id, ma, ten, gio_bat_dau, gio_ket_thuc, phut_nghi, phut_cho_tre)
VALUES
  (1, 'CA-HC', 'Hanh chinh', '08:00', '17:00', 60, 10),
  (2, 'CA-S',  'Sang',       '08:00', '12:00', 15, 5),
  (3, 'CA-C',  'Chieu',      '13:00', '17:00', 15, 5),
  (4, 'CA-T',  'Toi',        '18:00', '22:00', 15, 5)
ON CONFLICT DO NOTHING;

-- 5) diem_cham_cong
INSERT INTO diem_cham_cong (id, ten, vi_do, kinh_do, ban_kinh_met, wifi_cho_phep, dang_hoat_dong)
VALUES
  (1, 'Van phong - Tang 5', 10.776889, 106.700806, 80,
    '[{"ssid":"Company-WiFi","bssid":"AA:BB:CC:DD:EE:FF"},{"ssid":"Company-Guest","bssid":"11:22:33:44:55:66"}]'::jsonb,
    true),
  (2, 'Kho hang', 10.777100, 106.701200, 120,
    '[{"ssid":"Warehouse-WiFi","bssid":"77:88:99:AA:BB:CC"}]'::jsonb,
    true)
ON CONFLICT DO NOTHING;

-- 6) cham_cong (su kien vao/ra)
INSERT INTO cham_cong (id, nhan_vien_id, loai, thoi_gian, nguon, diem_cham_cong_id, wifi_ssid, wifi_bssid, vi_do, kinh_do, anh_url, ghi_chu)
VALUES
  (1, 4, 'vao', now() - interval '1 days' + time '08:05', 'wifi', 1, 'Company-WiFi', 'AA:BB:CC:DD:EE:FF', 10.776900, 106.700800, NULL, 'Di lam dung gio'),
  (2, 4, 'ra',  now() - interval '1 days' + time '17:10', 'wifi', 1, 'Company-WiFi', 'AA:BB:CC:DD:EE:FF', 10.776900, 106.700800, NULL, 'Tan ca'),
  (3, 5, 'vao', now() - interval '1 days' + time '08:20', 'gps',  1, NULL, NULL, 10.776950, 106.700850, NULL, 'Tre 10 phut'),
  (4, 5, 'ra',  now() - interval '1 days' + time '17:00', 'gps',  1, NULL, NULL, 10.776950, 106.700850, NULL, NULL),
  (5, 4, 'vao', now() + time '08:02', 'wifi', 1, 'Company-WiFi', 'AA:BB:CC:DD:EE:FF', 10.776900, 106.700800, NULL, NULL)
ON CONFLICT DO NOTHING;

-- 7) don_nghi_phep
INSERT INTO don_nghi_phep (
  id, nhan_vien_id, tu_ngay, den_ngay, ly_do, trang_thai, nguoi_duyet_tai_khoan_id, duyet_luc, ghi_chu_duyet
)
VALUES
  (1, 4, current_date + 7, current_date + 7, 'Kham benh', 'cho_duyet', NULL, NULL, NULL),
  (2, 5, current_date - 2, current_date - 1, 'Viec gia dinh', 'da_duyet', 2, now() - interval '1 days', 'Da duyet nghi phep'),
  (3, 6, current_date + 1, current_date + 10, 'Thai san', 'da_duyet', 2, now() - interval '5 days', 'Thai san theo quy dinh')
ON CONFLICT DO NOTHING;

-- 8) thong_bao
INSERT INTO thong_bao (
  id, tieu_de, noi_dung, kenh, nguoi_tao_tai_khoan_id, pham_vi, phong_ban_id, vai_tro_nhan, danh_sach_tai_khoan_id,
  hen_gio_gui_luc, da_gui_luc
)
VALUES
  (1, 'Thong bao chung', 'Hop cong ty luc 09:00 thu 2.', 'ung_dung', 3, 'toan_cong_ty', NULL, NULL, '[]'::jsonb,
    now() - interval '2 days', now() - interval '2 days'),
  (2, 'Thong bao Phong Ky Thuat', 'Deploy he thong luc 22:00 toi nay.', 'push', 3, 'phong_ban', 3, NULL, '[]'::jsonb,
    now() + interval '2 hours', NULL),
  (3, 'Thong bao theo vai tro', 'Vui long cap nhat thong tin nhan su trong tuan nay.', 'email', 2, 'vai_tro', NULL, 'nhan_vien', '[]'::jsonb,
    now() - interval '1 days', now() - interval '1 days'),
  (4, 'Thong bao danh sach', 'Tai khoan duoc yeu cau doi mat khau.', 'ung_dung', 3, 'danh_sach_tai_khoan', NULL, NULL, '[4,5]'::jsonb,
    now() - interval '3 hours', now() - interval '3 hours')
ON CONFLICT DO NOTHING;

COMMIT;
