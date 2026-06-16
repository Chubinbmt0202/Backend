import express from 'express';
import {
    getAttendanceStatus,
    getAllAttendance,
    getEmployeeAttendanceHistory,
    verifyAttendanceFace,
    getLateExplanations,
    getEmployeeLateExplanations,
    updateLateExplanationStatus,
    getAttendanceTrend
} from '../controllers/attendanceController.js';

import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';
import admin from '../config/firebase.js';
import { createNotificationHelper } from '../controllers/notificationController.js';

const router = express.Router();

// GET /api/attendance/late-explanations/all - Lấy tất cả giải trình đi trễ (cho HR)
router.get('/late-explanations/all', getLateExplanations);

// GET /api/attendance/late-explanations/employee/:employeeId - Lấy giải trình đi trễ của 1 nhân viên
router.get('/late-explanations/employee/:employeeId', getEmployeeLateExplanations);

// PATCH /api/attendance/late-explanations/update-status - Phê duyệt hoặc từ chối giải trình
router.patch('/late-explanations/update-status', updateLateExplanationStatus);


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

// Hàm tính khoảng cách GPS (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371e3; // Bán kính trái đất tính bằng mét
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Trả về khoảng cách bằng mét
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

// GET /api/attendance/summary/trend - Lấy thống kê xu hướng chấm công (7 ngày hoặc 30 ngày)
router.get('/summary/trend', getAttendanceTrend);

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
                message: `Vui lòng chụp hình trong môi trường đủ ánh sáng, ...`
            });
        }

        // Kiểm tra trùng lặp khuôn mặt với nhân viên khác
        const checkQuery = `
            SELECT id_nhan_vien, ho_va_ten, du_lieu_khuon_mat
            FROM NHAN_VIEN
            WHERE du_lieu_khuon_mat IS NOT NULL
              AND id_nhan_vien != $1
              AND id_tai_khoan != $1
        `;
        const checkResult = await pool.query(checkQuery, [userId]);

        for (const row of checkResult.rows) {
            const savedEmbeddings = typeof row.du_lieu_khuon_mat === 'string'
                ? JSON.parse(row.du_lieu_khuon_mat)
                : row.du_lieu_khuon_mat;

            if (Array.isArray(savedEmbeddings)) {
                for (const newEmb of embeddings) {
                    const distances = savedEmbeddings.map(savedEmb => euclideanDistance(savedEmb, newEmb));
                    const minDistance = Math.min(...distances);
                    if (minDistance <= 10.0) { // THRESHOLD = 10.0 cho Facenet
                        return res.status(400).json({
                            success: false,
                            message: `Khuôn mặt này đã được đăng ký bởi nhân viên ${row.ho_va_ten} (${row.id_nhan_vien}).`
                        });
                    }
                }
            }
        }

        // Lưu vào Database (NHAN_VIEN.du_lieu_khuon_mat)
        const embeddingJSON = JSON.stringify(embeddings);
        const updateQuery = `
            UPDATE NHAN_VIEN
            SET du_lieu_khuon_mat = $1::jsonb, hinh_anh = $3
            WHERE id_nhan_vien = $2 OR id_tai_khoan = $2
            RETURNING id_nhan_vien, ho_va_ten, hinh_anh;
        `;

        const result = await pool.query(updateQuery, [embeddingJSON, userId, urls[0]]);

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
        const { userId, url, evidence, action, isOvertime } = req.body;
        console.log("req.body", req.body);
        if (!userId || !url) {
            return res.status(400).json({ success: false, message: 'Thiếu userId hoặc url ảnh.' });
        }

        // ==========================================
        // 0. KIỂM TRA VỊ TRÍ CHẤM CÔNG (WIFI / GPS) - ĐÃ ĐƯỢC LƯỢC BỎ THEO YÊU CẦU
        // ==========================================
        let locationNote = 'Không kiểm tra vị trí';

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

            // Lấy bản ghi chấm công gần nhất trong vòng 24 giờ
            const existingRecord = await pool.query(
                `SELECT id_cham_cong, gio_vao, gio_ra, ghi_chu FROM CHAM_CONG 
                 WHERE id_nhan_vien = $1 AND gio_vao >= NOW() - INTERVAL '24 HOURS'
                 ORDER BY gio_vao DESC
                 LIMIT 1`,
                [user.id_nhan_vien]
            );

            let timeRecorded;
            let additionalNote = '';

            if (evidence) {
                additionalNote = ` - Vị trí: ${locationNote}`;
            }

            if (action === 'check_out') {
                if (existingRecord.rowCount > 0 && !existingRecord.rows[0].gio_ra) {
                    // Đã check-in rồi → cập nhật gio_ra (check-out)
                    const dbNote = existingRecord.rows[0].ghi_chu || '';
                    const isOtRecord = dbNote.toLowerCase().includes('tăng ca') || dbNote.toLowerCase().includes('ot') || isOvertime === true || isOvertime === 'true';
                    
                    let checkOutNote = `Check-out qua AI (Python)${additionalNote}`;
                    if (isOtRecord) {
                        checkOutNote = `Tăng ca - Check-out qua AI (Python)${additionalNote}`;
                    }

                    const updateResult = await pool.query(
                        `UPDATE CHAM_CONG SET gio_ra = now(), url_anh_ra = $1, ghi_chu = $2
                         WHERE id_cham_cong = $3 RETURNING gio_ra`,
                        [url, checkOutNote, existingRecord.rows[0].id_cham_cong]
                    );
                    timeRecorded = updateResult.rows[0].gio_ra;
                } else if (existingRecord.rowCount > 0 && existingRecord.rows[0].gio_ra) {
                    return res.status(400).json({ success: false, message: 'Bạn đã chấm công ra rồi.' });
                } else {
                    return res.status(400).json({ success: false, message: 'Bạn chưa chấm công vào, không thể chấm công ra.' });
                }
            } else {
                // action === 'check_in' hoặc mặc định
                if (existingRecord.rowCount > 0 && !existingRecord.rows[0].gio_ra) {
                    return res.status(400).json({ success: false, message: 'Bạn đã chấm công vào rồi, vui lòng chấm công ra.' });
                }

                // Lấy id_ca_lam mặc định
                const shiftRes = await pool.query('SELECT id_ca_lam_viec FROM CA_LAM_VIEC LIMIT 1');
                const idCaLam = shiftRes.rowCount > 0 ? shiftRes.rows[0].id_ca_lam_viec : null;

                // Chưa check-in → tạo bản ghi mới
                const { lateReason } = req.body;
                let finalNote = `Chấm công qua AI (Python)${additionalNote}`;
                if (isOvertime === true || isOvertime === 'true') {
                    finalNote = `Tăng ca - Chấm công qua AI (Python)${additionalNote}`;
                } else if (lateReason) {
                    finalNote = `Đi trễ - Giải trình: ${lateReason}${additionalNote}`;
                }

                const insertChamCong = `
                    INSERT INTO CHAM_CONG (id_cham_cong, id_nhan_vien, id_ca_lam, gio_vao, url_anh_vao, ghi_chu)
                    VALUES ($1, $2, $3, now(), $4, $5)
                    RETURNING gio_vao;
                `;
                const insertResult = await pool.query(insertChamCong, [
                    id_cham_cong,
                    user.id_nhan_vien,
                    idCaLam,
                    url,
                    finalNote
                ]);
                timeRecorded = insertResult.rows[0].gio_vao;

                // Nếu đi trễ quá giờ cho phép và có giải trình, lưu vào bảng GIAI_TRINH_DI_TRE
                if (lateReason) {
                    try {
                        const id_giai_trinh = generateId('GT');
                        await pool.query(
                            `INSERT INTO GIAI_TRINH_DI_TRE (id_giai_trinh, id_nhan_vien, ngay_giai_trinh, gio_vao_tre, ly_do, trang_thai)
                             VALUES ($1, $2, CURRENT_DATE, now(), $3, NULL)`,
                            [id_giai_trinh, user.id_nhan_vien, lateReason]
                        );

                        // Gửi thông báo cho HR/Admin
                        const getHrQuery = `
                            SELECT nv.id_nhan_vien 
                            FROM NHAN_VIEN nv
                            JOIN TAI_KHOAN tk ON nv.id_tai_khoan = tk.id_tai_khoan
                            JOIN VAI_TRO vt ON tk.id_vai_tro = vt.id_vai_tro
                            WHERE vt.ten_vai_tro ILIKE '%Admin%' OR vt.ten_vai_tro ILIKE '%HR%' OR vt.ten_vai_tro ILIKE '%Nhân sự%'
                        `;
                        const hrResult = await pool.query(getHrQuery);
                        const empName = user.full_name || "Nhân viên";

                        for (const hr of hrResult.rows) {
                            await createNotificationHelper(
                                hr.id_nhan_vien,
                                "Giải trình đi trễ mới 📝",
                                `${empName} vừa gửi giải trình đi trễ: "${lateReason}"`,
                                "LATE_EXPLANATION"
                            );
                        }

                        // Đồng bộ lên kênh admin_notifications cho Web App (AdminTime)
                        const notifId = generateId('TB');
                        await admin.database().ref(`admin_notifications/${notifId}`).set({
                            id_thong_bao: notifId,
                            id_nhan_vien: user.id_nhan_vien,
                            ho_ten_nhan_vien: empName,
                            tieu_de: "Giải trình đi trễ mới 📝",
                            noi_dung: `${empName} vừa gửi giải trình đi trễ: "${lateReason}"`,
                            loai_thong_bao: "LATE_EXPLANATION",
                            da_doc: false,
                            ngay_tao: Date.now()
                        });
                        console.log(`🔥 Đã đồng bộ thông báo giải trình đi trễ lên admin_notifications`);
                    } catch (giaiTrinhErr) {
                        console.error("Lỗi khi lưu giải trình đi trễ hoặc gửi thông báo:", giaiTrinhErr.message);
                    }
                }
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