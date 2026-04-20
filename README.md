# Backend App Chấm Công

Dự án Backend cho hệ thống chấm công sử dụng Node.js, Express, PostgreSQL và Supabase.

## 🚀 Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống
- Node.js (phiên bản 16.x trở lên)
- PostgreSQL
- Tài khoản Supabase (để lưu trữ ảnh)

### 2. Cài đặt Dependencies
Mở terminal tại thư mục gốc của backend và chạy lệnh:
```bash
npm install
```

### 3. Cấu hình môi trường (Environment Variables)
1. Sao chép tệp `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
2. Mở tệp `.env` và điền đầy đủ thông tin kết nối:
   - **Cơ sở dữ liệu**: Bạn có thể dùng `DATABASE_URL` hoặc điền các thông số lẻ (`DB_USER`, `DB_HOST`, v.v.).
   - **Supabase**: Lấy `SUPABASE_URL` và `SUPABASE_KEY` từ bảng điều khiển Supabase của bạn.
   - **Secrets**: Thay đổi `SESSION_SECRET` và `JWT_SECRET` thành các chuỗi bảo mật của riêng bạn.

### 4. Khởi tạo Cơ sở dữ liệu
Dự án có sẵn tệp `database.sql`. Bạn hãy chạy các câu lệnh SQL trong tệp này trên PostgreSQL của mình để tạo các bảng cần thiết.

### 5. Chạy ứng dụng

#### Chế độ phát triển (Development):
```bash
npm run dev
```
Server sẽ chạy tại: `http://localhost:3000`

#### Chế độ Production:
```bash
npm start
```

## 📁 Cấu trúc thư mục chính
- `config/`: Cấu hình kết nối DB và Supabase.
- `controllers/`: Xử lý logic nghiệp vụ cho từng module.
- `routes/`: Định nghĩa các API endpoints.
- `utils/`: Các hàm tiện ích dùng chung.
- `database.sql`: Schema cơ sở dữ liệu.

## 🛠 Các công nghệ sử dụng
- **Framework**: Express.js
- **Database**: PostgreSQL (pg pool)
- **Storage**: Supabase Storage
- **Auth**: Express Session / JWT / Bcrypt
- **Face API**: Facial Recognition (nếu có sử dụng)
