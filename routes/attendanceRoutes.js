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
const PYTHON_AI_URL = 'http://127.0.0.1:8000/api/extract';
const PYTHON_HEALTH_URL = 'http://127.0.0.1:8000/api/health';

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

        // Lưu vào Database (nhan_vien.du_lieu_khuon_mat)
        const embeddingJSON = JSON.stringify(embeddings);
        const updateQuery = `
            UPDATE nhan_vien
            SET du_lieu_khuon_mat = $1::jsonb,
                khuon_mat_da_cap_nhat = true,
                cap_nhat_luc = now()
            WHERE id = $2 OR tai_khoan_id = $2
            RETURNING id, ma_nhan_vien, ho_ten, khuon_mat_da_cap_nhat;
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
        const userQuery = `
            SELECT
                nv.id AS nhan_vien_id,
                tk.ten_dang_nhap AS username,
                nv.ho_ten AS full_name,
                nv.du_lieu_khuon_mat
            FROM nhan_vien nv
            LEFT JOIN tai_khoan tk ON tk.id = nv.tai_khoan_id
            WHERE nv.id = $1 OR nv.tai_khoan_id = $1
            LIMIT 1
        `;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rowCount === 0) return res.status(404).json({ success: false, message: "User không tồn tại." });
        const user = userResult.rows[0];

        if (!user.du_lieu_khuon_mat) {
            return res.status(400).json({ success: false, message: "User chưa đăng ký khuôn mặt." });
        }

        // Parse cẩn thận dữ liệu từ DB
        const savedEmbeddings = typeof user.du_lieu_khuon_mat === 'string'
            ? JSON.parse(user.du_lieu_khuon_mat)
            : user.du_lieu_khuon_mat;

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
            // ==========================================
            // 🚀 4. LƯU LỊCH SỬ CHẤM CÔNG VÀO DATABASE (cham_cong)
            // ==========================================

            let timeRecorded;
            let attendanceType;

            // Nếu hôm nay đã có bản ghi 'vao' thì coi là check-out, ngược lại check-in
            const checkInExistsQuery = `
                SELECT 1
                FROM cham_cong
                WHERE nhan_vien_id = $1
                  AND (date(thoi_gian))::date = CURRENT_DATE
                  AND loai = 'vao'
                LIMIT 1
            `;
            const checkInExists = await pool.query(checkInExistsQuery, [user.nhan_vien_id]);

            const loai = checkInExists.rowCount === 0 ? 'vao' : 'ra';
            const insertChamCong = `
                INSERT INTO cham_cong (nhan_vien_id, loai, thoi_gian, nguon, anh_url, ghi_chu)
                VALUES ($1, $2, now(), 'qr', $3, $4)
                RETURNING thoi_gian;
            `;
            const insertResult = await pool.query(insertChamCong, [
                user.nhan_vien_id,
                loai,
                url,
                loai === 'vao' ? 'Check-in qua AI' : 'Check-out qua AI'
            ]);

            timeRecorded = insertResult.rows[0].thoi_gian;
            attendanceType = loai === 'vao' ? 'Check-in' : 'Check-out';

            // 5. Trả dữ liệu về cho Điện thoại hiển thị
            return res.json({
                success: true,
                message: `Điểm danh thành công! Xác nhận đúng người.`,
                match_distance: bestMatchDistance.toFixed(2),
                data: {
                    iduser: user.nhan_vien_id,
                    fullname: user.full_name,
                    time: timeRecorded, // Ngày giờ chấm công (lấy chuẩn từ máy chủ DB)
                    type: attendanceType // Trả thêm loại để App hiện "Bạn vừa Check-in" hay "Bạn vừa Check-out"
                }
            });

        } else {
            return res.status(401).json({
                success: false,
                message: 'Khuôn mặt không khớp! Vui lòng lùi lại .',
                match_distance: bestMatchDistance.toFixed(2)
            });
        }

    } catch (error) {
        console.error('Lỗi /checkAttendance:', error);
        res.status(500).json({ success: false, message: 'Lỗi server Node.js: ' + error.message });
    }
});

export default router;