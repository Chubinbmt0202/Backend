import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import pool from './config/db.js'; // Import file kết nối database

const app = express();
const port = process.env.PORT || 3000;

// Middlewares (Các bộ lọc)
app.use(cors()); // Cho phép gọi API từ App
app.use(express.json()); // Giúp Backend đọc được dữ liệu JSON gửi lên

// Một API test thử để xem server có chạy không     
app.get('/', (req, res) => {
    res.send('Backend App Chấm Công đang chạy bình thường!');
});

// Lắng nghe ở cổng (port) đã định
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});