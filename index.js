import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
dotenv.config();

import pool from './config/db.js'; // Import file kết nối database
import employeeRoutes from './routes/employeeRoutes.js'; // Import route nhân viên
import authRoutes from './routes/authRoutes.js'; // Import route authentication
import attendanceRoutes from './routes/attendanceRoutes.js'; // Import route chấm công
import shiftRoutes from './routes/shiftRoutes.js'; // Import route ca
import roleRoutes from './routes/roleRoutes.js'; // Import route vai trò
import departmentRoutes from './routes/departmentRoutes.js'; // Import route phòng ban
import uploadRoutes from './routes/uploadRoutes.js'; // Import route upload ảnh Supabase
import officeRoutes from './routes/officeRoutes.js'; // Import route văn phòng và GPS

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

// Lắng nghe ở cổng (port) đã định
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});