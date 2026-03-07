-- Bảng 1: Lưu thông tin người dùng
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
    full_name VARCHAR(100) NOT NULL,
    face_mesh_data JSONB, -- Sử dụng JSONB cho PostgreSQL để tối ưu hiệu suất
    is_face_updated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 2: Cấu hình địa điểm công ty (GPS và Wifi)
CREATE TABLE company_locations (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    wifi_ssid VARCHAR(100) NOT NULL,
    wifi_mac_address VARCHAR(50),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    allowed_radius_meters INT DEFAULT 50,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng 3: Ghi nhận lịch sử chấm công
CREATE TABLE attendance_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL, -- Đổi tên thành log_date để tránh trùng từ khóa hệ thống
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    check_in_photo_url VARCHAR(255),
    check_out_photo_url VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('present', 'late', 'half_day')) DEFAULT 'present',
    UNIQUE(user_id, log_date) -- Đảm bảo 1 nhân viên chỉ có 1 bản ghi mỗi ngày
);
