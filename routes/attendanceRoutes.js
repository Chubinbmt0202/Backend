import express from 'express';
import {
    getAttendanceStatus,
    getAllAttendance,
    getEmployeeAttendanceHistory,
    verifyAttendanceFace
} from '../controllers/attendanceController.js';

import pool from '../config/db.js';

const router = express.Router();

// ==========================================
// CẤU HÌNH MICROSERVICE
// ==========================================
// Đảm bảo IP này trùng với IP mà server Python đang chạy (hoặc dùng localhost/127.0.0.1 nếu chạy cùng máy)
const PYTHON_AI_URL = 'http://192.168.2.29:8000/api/extract';
const PYTHON_HEALTH_URL = 'http://192.168.2.29:8000/api/health';

// Hàm tính khoảng cách giữa 2 vector khuôn mặt (Euclidean Distance)
const euclideanDistance = (arr1, arr2) => {
    return Math.sqrt(arr1.reduce((acc, val, i) => acc + Math.pow(val - arr2[i], 2), 0));
};

// ==========================================
// KIỂM TRA KẾT NỐI MICROSERVICE KHI KHỞI ĐỘNG
// ==========================================
const checkMicroserviceConnection = async () => {
    console.log("⏳ Đang kiểm tra kết nối tới Microservice Python...");
    try {
        const response = await fetch(PYTHON_HEALTH_URL);
        if (response.ok) {
            console.log("✅ Tín hiệu XANH: Đã kết nối thành công với Microservice AI!");
        } else {
            console.log(`⚠️ Tín hiệu VÀNG: Kết nối được nhưng Python trả về mã lỗi ${response.status}`);
        }
    } catch (error) {
        console.error("❌ Tín hiệu ĐỎ: Không thể kết nối tới Microservice Python!");
        console.error("👉 Gợi ý: Hãy chắc chắn bạn đã chạy lệnh 'uvicorn main:app --port 8000' bên Terminal của Python nhé.");
    }
};

// Kích hoạt hàm kiểm tra ngay lập tức
checkMicroserviceConnection();
// ==========================================
// CÁC ROUTE CHẤM CÔNG CƠ BẢN
// ==========================================
// POST /api/attendance/verify - Xác thực khuôn mặt chấm công
router.post('/verify', verifyAttendanceFace);

// GET /api/attendance/list/daily?date=YYYY-MM-DD - Lấy danh sách chấm công của tất cả NV
router.get('/list/daily', getAllAttendance);

// GET /api/attendance/history/:userId - Lấy lịch sử chấm công của 1 NV
router.get('/history/:userId', getEmployeeAttendanceHistory);

// GET /api/attendance/:userId?date=YYYY-MM-DD - Lấy trạng thái chấm công của 1 NV
router.get('/:userId', getAttendanceStatus);

// =========================================================================
// API 1: ĐĂNG KÝ KHUÔN MẶT (GỌI SANG PYTHON)
// =========================================================================
router.post('/testRegister', async (req, res) => {
    // Dùng biến Date.now() để đo thời gian chuẩn xác nhất thay vì console.time
    const startTotalTime = Date.now();

    try {
        const { urls, userId = 1 } = req.body;

        if (!urls || !Array.isArray(urls) || urls.length !== 3) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đúng 3 link ảnh.' });
        }

        const embeddings = [];

        console.log("🤖 Đang nhờ Python xử lý 3 ảnh cùng lúc...");
        const startAITime = Date.now();

        // 🚀 BẮN SONG SONG 3 REQUEST SANG PYTHON
        const aiPromises = urls.map(async (url) => {
            const aiResponse = await fetch(PYTHON_AI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            return aiResponse.json();
        });

        // Chờ Python trả kết quả về
        const aiResults = await Promise.all(aiPromises);

        for (const aiData of aiResults) {
            if (aiData.success) {
                embeddings.push(aiData.embedding);
            } else {
                console.log(`[CẢNH BÁO] Python từ chối ảnh:`, aiData.detail);
            }
        }

        const aiDuration = ((Date.now() - startAITime) / 1000).toFixed(2);
        console.log(`⏱️ THỜI GIAN PYTHON XỬ LÝ 3 ẢNH: ${aiDuration} giây`);

        if (embeddings.length !== 3) {
            return res.status(400).json({
                success: false,
                message: `Chỉ trích xuất được ${embeddings.length}/3 khuôn mặt. Vui lòng chụp rõ mặt hơn.`
            });
        }

        // Lưu vào Database
        const embeddingJSON = JSON.stringify(embeddings);
        const updateQuery = `
            UPDATE users SET face_mesh_data = $1, is_face_updated = true
            WHERE id = $2 RETURNING id, username, full_name, is_face_updated;
        `;

        const result = await pool.query(updateQuery, [embeddingJSON, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        const totalDuration = ((Date.now() - startTotalTime) / 1000).toFixed(2);
        console.log(`🏁 TỔNG THỜI GIAN TỪ LÚC NHẬN API TỚI KHI LƯU DB: ${totalDuration} giây`);

        res.json({
            success: true,
            message: 'Đăng ký khuôn mặt thành công qua Microservice!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi /testRegister:', error);
        res.status(500).json({ success: false, message: 'Lỗi server Node.js: ' + error.message });
    }
});

// =========================================================================
// API 2: ĐIỂM DANH (SO SÁNH KHUÔN MẶT QUA PYTHON)
// =========================================================================
router.post('/checkAttendance', async (req, res) => {
    try {
        const { userId, url } = req.body;

        if (!userId || !url) {
            return res.status(400).json({ success: false, message: 'Thiếu userId hoặc url ảnh.' });
        }

        // 1. Lấy 3 khuôn mặt gốc từ DB
        const userQuery = `SELECT id, username, full_name, face_mesh_data FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rowCount === 0) return res.status(404).json({ success: false, message: "User không tồn tại." });
        const user = userResult.rows[0];

        if (!user.face_mesh_data) {
            return res.status(400).json({ success: false, message: "User chưa đăng ký khuôn mặt." });
        }

        // Parse cẩn thận dữ liệu từ DB
        const savedEmbeddings = typeof user.face_mesh_data === 'string'
            ? JSON.parse(user.face_mesh_data)
            : user.face_mesh_data;

        // 2. Gửi ảnh điểm danh sang Python
        console.log(`Đang gửi ảnh điểm danh sang Python...`);
        const aiResponse = await fetch(PYTHON_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const aiData = await aiResponse.json();

        if (!aiResponse.ok || !aiData.success) {
            return res.status(400).json({ success: false, message: aiData.detail || "Không tìm thấy khuôn mặt." });
        }

        const newEmbedding = aiData.embedding;

        // 3. Tiến hành so sánh bằng thuật toán Euclidean
        const distances = savedEmbeddings.map(savedEmb => euclideanDistance(savedEmb, newEmbedding));
        const bestMatchDistance = Math.min(...distances);

        console.log(`Độ lệch khuôn mặt: ${bestMatchDistance}`);

        // Ngưỡng 10.0 cho thuật toán Facenet của thư viện DeepFace
        const THRESHOLD = 10.0;

        if (bestMatchDistance <= THRESHOLD) {
            return res.json({
                success: true,
                message: 'Điểm danh thành công! Xác nhận đúng người.',
                match_distance: bestMatchDistance.toFixed(2),
                user: { id: user.id, full_name: user.full_name }
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Khuôn mặt không khớp! Vui lòng chụp lại rõ hơn.',
                match_distance: bestMatchDistance.toFixed(2)
            });
        }

    } catch (error) {
        console.error('Lỗi /checkAttendance:', error);
        res.status(500).json({ success: false, message: 'Lỗi server Node.js: ' + error.message });
    }
});

export default router;