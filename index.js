import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
dotenv.config();

import pool from './config/db.js'; // Import file kết nối database
import './config/firebase.js'; // Khởi tạo Firebase Admin
import employeeRoutes from './routes/nhanVienRoutes.js'; // Import route nhân viên
import authRoutes from './routes/xacThucRoutes.js'; // Import route authentication
import attendanceRoutes from './routes/diemDanhRoutes.js'; // Import route chấm công
import shiftRoutes from './routes/caLamViecRoutes.js'; // Import route ca
import roleRoutes from './routes/vaiTroRoutes.js'; // Import route vai trò
import departmentRoutes from './routes/phongBanRoutes.js'; // Import route phòng ban
import uploadRoutes from './routes/taiLenRoutes.js'; // Import route upload ảnh Supabase
import officeRoutes from './routes/vanPhongRoutes.js'; // Import route văn phòng và GPS
import leaveRoutes from './routes/nghiPhepRoutes.js'; // Import route đơn xin nghỉ
import notificationRoutes from './routes/thongBaoRoutes.js'; // Import route thông báo
import otRoutes from './routes/tangCaRoutes.js'; // Import route tăng ca


const app = express();
const port = process.env.PORT || 3001;

// Middlewares (Các bộ lọc)
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true, // Cho phép gửi cookie session từ frontend
  })
); // Cho phép gọi API từ App
app.use(express.json()); // Giúp Backend đọc được dữ liệu JSON gửi lên

// Session cookie (không dùng JWT)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    },
  })
);

// Một API test thử để xem server có chạy không     
app.get('/', (req, res) => {
  res.send('Backend App Chấm Công đang chạy bình thường!');
});

// Các API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/upload', uploadRoutes); // Route upload file lên Supabase
app.use('/api/offices', officeRoutes); // Route quản lý văn phòng và định vị GPS
app.use('/api/leave', leaveRoutes); // Route quản lý đơn xin nghỉ
app.use('/api/notifications', notificationRoutes); // Route gửi thông báo push
app.use('/api/ot', otRoutes); // Route đăng ký OT


// Lắng nghe ở cổng (port) đã định
app.listen(port, () => {
  console.log(`Server đang chạy tại http://:${port}`);
});

// Cron job: Tự động xóa thông báo cũ hơn 30 phút
setInterval(async () => {
  try {
    const query = `
      SELECT id_thong_bao, id_nhan_vien 
      FROM THONG_BAO 
      WHERE ngay_tao < NOW() - INTERVAL '30 minutes'
    `;
    const result = await pool.query(query);
    
    if (result.rowCount > 0) {
      // 1. Xóa trên Firebase Realtime Database
      for (const row of result.rows) {
        try {
          // Lấy instance admin đã được export từ config/firebase.js.
          // Do file index.js có import './config/firebase.js' nhưng không lưu vào biến,
          // ta cần import admin một cách rõ ràng.
          const { default: admin } = await import('./config/firebase.js');
          await admin.database().ref(`notifications/${row.id_nhan_vien}/${row.id_thong_bao}`).remove();
        } catch (fbErr) {
          console.error(`Lỗi xóa thông báo ${row.id_thong_bao} trên Firebase:`, fbErr.message);
        }
      }
      
      // 2. Xóa trên PostgreSQL
      const ids = result.rows.map(r => r.id_thong_bao);
      await pool.query(`DELETE FROM THONG_BAO WHERE id_thong_bao = ANY($1)`, [ids]);
      console.log(`🧹 Đã tự động xóa ${result.rowCount} thông báo cũ hơn 30 phút.`);
    }
  } catch (error) {
    console.error('Lỗi khi tự động xóa thông báo:', error.message);
  }
}, 60 * 1000); // Chạy kiểm tra mỗi 1 phút