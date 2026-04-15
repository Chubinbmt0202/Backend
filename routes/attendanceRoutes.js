import express from 'express';
import {
    getAttendanceStatus,
    getAllAttendance,
    getEmployeeAttendanceHistory,
    verifyAttendanceFace
} from '../controllers/attendanceController.js';

import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

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

        // Lưu vào Database (NHAN_VIEN.du_lieu_khuon_mat)
        const embeddingJSON = JSON.stringify(embeddings);
        const updateQuery = `
            UPDATE NHAN_VIEN
            SET du_lieu_khuon_mat = $1::jsonb
            WHERE id_nhan_vien = $2 OR id_tai_khoan = $2
            RETURNING id_nhan_vien, ho_va_ten;
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
                nv.id_nhan_vien,
                tk.ten_dang_nhap AS username,
                nv.ho_va_ten AS full_name,
                nv.du_lieu_khuon_mat
            FROM NHAN_VIEN nv
            LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
            WHERE nv.id_nhan_vien = $1 OR nv.id_tai_khoan = $1
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
            // 🚀 4. LƯU LỊCH SỬ CHẤM CÔNG VÀO DATABASE (CHAM_CONG)
            // ==========================================

            const id_cham_cong = generateId('CC');

            // Kiểm tra xem hôm nay đã có bản ghi chấm công chưa
            const existingRecord = await pool.query(
                `SELECT id_cham_cong, gio_vao, gio_ra FROM CHAM_CONG 
                 WHERE id_nhan_vien = $1 AND gio_vao::date = CURRENT_DATE
                 LIMIT 1`,
                [user.id_nhan_vien]
            );

            let timeRecorded;

            if (existingRecord.rowCount > 0 && !existingRecord.rows[0].gio_ra) {
                // Đã check-in rồi → cập nhật gio_ra (check-out)
                const updateResult = await pool.query(
                    `UPDATE CHAM_CONG SET gio_ra = now(), url_anh = $1, ghi_chu = $2
                     WHERE id_cham_cong = $3 RETURNING gio_ra`,
                    [url, 'Check-out qua AI (Python)', existingRecord.rows[0].id_cham_cong]
                );
                timeRecorded = updateResult.rows[0].gio_ra;
            } else {
                // Chưa check-in → tạo bản ghi mới
                const insertChamCong = `
                    INSERT INTO CHAM_CONG (id_cham_cong, id_nhan_vien, gio_vao, url_anh, ghi_chu)
                    VALUES ($1, $2, now(), $3, $4)
                    RETURNING gio_vao;
                `;
                const insertResult = await pool.query(insertChamCong, [
                    id_cham_cong,
                    user.id_nhan_vien,
                    url,
                    'Chấm công qua AI (Python)'
                ]);
                timeRecorded = insertResult.rows[0].gio_vao;
            }

            // 5. Trả dữ liệu về cho Điện thoại hiển thị
            return res.json({
                success: true,
                message: `Điểm danh thành công! Xác nhận đúng người.`,
                match_distance: bestMatchDistance.toFixed(2),
                data: {
                    id_nhan_vien: user.id_nhan_vien,
                    fullname: user.full_name,
                    time: timeRecorded
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