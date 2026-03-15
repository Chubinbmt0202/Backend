import express from 'express';
import {
    getAttendanceStatus,
    getAllAttendance,
    getEmployeeAttendanceHistory,
    verifyAttendanceFace
} from '../controllers/attendanceController.js';

import pool from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Dùng createRequire để hack require của Node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// =========================================================================
// 2. MAGIC TRICK: HACK REQUIRE ĐỂ ĐÁNH LỪA FACE-API
// =========================================================================
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === '@tensorflow/tfjs-node') {
        // Khi face-api đòi bản Node (C++), ta trả về bản thuần JS (CPU)!
        return require('@tensorflow/tfjs');
    }
    return originalRequire.apply(this, arguments);
};
// =========================================================================

// 3. Bây giờ load face-api mặc định, nó sẽ ăn "cú lừa" bên trên và không bị crash
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 4. Monkey Patch môi trường
const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const router = express.Router();

let isAILoaded = false;

// ==========================================
// ĐƯA PHẦN LOAD MODEL RA NGOÀI ROUTE (CHỈ CHẠY 1 LẦN)
// ==========================================
const initFaceAPI = async () => {
    try {
        console.log("⏳ Đang khởi tạo AI Model vào bộ nhớ (Chỉ chạy 1 lần)...");
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
        const modelPath = path.join(__dirname, '../node_modules/@vladmandic/face-api/model');
        
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
        ]);
        isAILoaded = true;
        console.log("✅ Load Model thành công! Server đã sẵn sàng quét khuôn mặt.");
    } catch (error) {
        console.error("❌ Lỗi khởi tạo AI:", error);
    }
};

// Gọi hàm ngay khi file route này được import
initFaceAPI();

// POST /api/attendance/verify - Xác thực khuôn mặt chấm công
router.post('/verify', verifyAttendanceFace);

// GET /api/attendance/list/daily?date=YYYY-MM-DD - Lấy danh sách chấm công của tất cả NV
router.get('/list/daily', getAllAttendance);

// GET /api/attendance/history/:userId - Lấy lịch sử chấm công của 1 NV
router.get('/history/:userId', getEmployeeAttendanceHistory);

// GET /api/attendance/:userId?date=YYYY-MM-DD - Lấy trạng thái chấm công của 1 NV
router.get('/:userId', getAttendanceStatus);

router.post('/testRegister', async (req, res) => {
    try {
        const { urls, userId = 1 } = req.body;
        console.log("data", req.body)

        if (!isAILoaded) {
            return res.status(503).json({ success: false, message: "Server AI đang khởi động, vui lòng đợi vài giây rồi thử lại!" });
        }

        if (!urls || !Array.isArray(urls) || urls.length !== 3) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đúng 3 link ảnh trong mảng "urls".'
            });
        }

        console.log("Đang khởi tạo TensorFlow qua cú lừa (CPU Backend)...");
        
        // Gọi tf từ faceapi (vì ta đã lừa nó)
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();

        const modelPath = path.join(__dirname, '../node_modules/@vladmandic/face-api/model');
        
        console.log("Đang tải models nhận diện...");
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
                faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
            ]);
        } catch (modelError) {
            console.error("Lỗi load models:", modelError.message);
            return res.status(500).json({ 
                success: false, 
                message: "Không tìm thấy file model. Kiểm tra đường dẫn node_modules.", 
                error: modelError.message 
            });
        }

        const embeddings = [];

        for (const url of urls) {
            console.log(`Đang xử lý ảnh: ${url}`);
            try {
                const img = await loadImage(url);
                const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

                if (!detection) {
                    console.log(`[CẢNH BÁO] Không tìm thấy khuôn mặt trong ảnh: ${url}`);
                    continue;
                }
                embeddings.push(Array.from(detection.descriptor));
                console.log(`Đã trích xuất thành công: ${url}`);
            } catch (imgError) {
                console.error(`[LỖI] Khi tải/xử lý ảnh ${url}:`, imgError.message);
            }
        }

        if (embeddings.length !== 3) {
            return res.status(400).json({
                success: false,
                message: `Chỉ trích xuất được ${embeddings.length}/3 khuôn mặt.`
            });
        }

        const embeddingJSON = JSON.stringify(embeddings);
        const updateQuery = `
            UPDATE users SET face_mesh_data = $1, is_face_updated = true
            WHERE id = $2 RETURNING id, username, full_name, is_face_updated;
        `;

        const result = await pool.query(updateQuery, [embeddingJSON, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user" });
        }

        res.json({
            success: true,
            message: 'Đăng ký khuôn mặt thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi nghiêm trọng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

router.post('/checkAttendance', async (req, res) => {
    try {
        console.log("Hello")
        const { userId, url } = req.body;
        console.log("data", req.body)

        if (!isAILoaded) {
            return res.status(503).json({ success: false, message: "Server AI đang khởi động, vui lòng đợi vài giây rồi thử lại!" });
        }

        if (!userId || !url) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp "userId" và "url" ảnh để điểm danh.'
            });
        }

        // 1. Lấy dữ liệu khuôn mặt đã đăng ký từ Database
        const userQuery = `SELECT id, username, full_name, face_mesh_data FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy user." });
        }

        const user = userResult.rows[0];

        if (!user.face_mesh_data) {
            return res.status(400).json({ 
                success: false, 
                message: "User này chưa đăng ký khuôn mặt (chưa có face_mesh_data)." 
            });
        }

        // Phục hồi lại định dạng dữ liệu (Từ mảng JS thuần sang Float32Array mà face-api cần)
        // Kiểm tra nếu nó là chuỗi thì mới parse, còn nếu pg đã tự parse thành mảng rồi thì dùng luôn
const savedEmbeddingsArray = typeof user.face_mesh_data === 'string' 
    ? JSON.parse(user.face_mesh_data) 
    : user.face_mesh_data;
        const labeledDescriptors = savedEmbeddingsArray.map(arr => new Float32Array(arr));

        console.log(`Đang xử lý ảnh điểm danh của user: ${user.full_name || userId}`);

        // 2. Khởi tạo TensorFlow và Models (Giống API trước)
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
        const modelPath = path.join(__dirname, '../node_modules/@vladmandic/face-api/model');
        
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
        ]);

        // 3. Trích xuất khuôn mặt từ ảnh mới
        const { loadImage } = require('canvas');
        let img;
        try {
            img = await loadImage(url);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Không thể tải ảnh từ url này." });
        }

        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy khuôn mặt nào trong ảnh điểm danh. Vui lòng chụp lại rõ hơn!'
            });
        }

        // 4. TIẾN HÀNH SO SÁNH (MATCHING)
        // Tạo một nhãn dán (Label) chứa 3 khuôn mặt mẫu của user đó
        const referenceData = new faceapi.LabeledFaceDescriptors(user.id.toString(), labeledDescriptors);
        
        // Tạo bộ so sánh với độ lệch tối đa cho phép là 0.55 (Càng nhỏ càng khắt khe)
        // Ngưỡng 0.6 là mặc định. Bạn có thể hạ xuống 0.5 để chống nhận diện nhầm người khác có nét giống.
        const faceMatcher = new faceapi.FaceMatcher([referenceData], 0.55);

        // Tìm khuôn mặt giống nhất với ảnh vừa gửi lên
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        // Nếu cái tên (label) trùng với userId -> Đúng người!
        if (bestMatch.label === user.id.toString()) {
            
            // Tới đây là thành công, bạn có thể INSERT vào bảng lịch sử chấm công (attendance_logs) ở đây
            // const insertLogQuery = `INSERT INTO attendance_logs (user_id, time_in) VALUES ($1, NOW()) RETURNING *`;
            // await pool.query(insertLogQuery, [userId]);

            return res.json({
                success: true,
                message: 'Điểm danh thành công! Xác nhận đúng khuôn mặt.',
                match_distance: bestMatch.distance, // Khoảng cách lệch (VD: 0.35 -> rất giống)
                user: {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name
                }
            });
        } else {
            // bestMatch.label sẽ mang giá trị "unknown" nếu độ lệch > 0.55
            return res.status(401).json({
                success: false,
                message: 'Khuôn mặt không khớp với dữ liệu đã đăng ký! Vui lòng thử lại.',
                match_distance: bestMatch.distance 
            });
        }

    } catch (error) {
        console.error('Lỗi trong /checkAttendance:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
});

export default router;