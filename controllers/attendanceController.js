import pool from '../config/db.js';
import { findBestMatch } from '../utils/faceUtils.js';

const normalizeEmbedding = (raw) => {
    if (raw == null) return raw;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    return raw;
};

/**
 * Controller API Lấy trạng thái chấm công của nhân viên trong ngày
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const getAttendanceStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { date } = req.query; // Nhận ngày từ query parameter, định dạng YYYY-MM-DD

        // Kiểm tra userId hợp lệ
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID người dùng không hợp lệ.'
            });
        }

        // Nếu không truyền date, lấy ngày hiện tại (theo múi giờ server/local)
        const queryDate = date || new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                $2::date AS log_date,
                MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') AS check_in_time,
                MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') AS check_out_time,
                CASE
                    WHEN MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') IS NULL THEN 'none'
                    WHEN MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status
            FROM cham_cong cc
            WHERE cc.nhan_vien_id = $1
              AND (date(cc.thoi_gian))::date = $2::date
        `;

        const result = await pool.query(query, [userId, queryDate]);

        res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu chấm công thành công.',
            data: result.rows[0] || {
                log_date: queryDate,
                check_in_time: null,
                check_out_time: null,
                status: 'none'
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy trạng thái chấm công:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

/**
 * Controller API Lấy danh sách chấm công của tất cả nhân viên trong ngày
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const getAllAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date || new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                nv.id AS employee_id,
                nv.ho_ten AS full_name,
                tk.ten_dang_nhap AS username,
                $1::date AS log_date,
                MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') AS check_in_time,
                MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') AS check_out_time,
                CASE
                    WHEN MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') IS NULL THEN 'none'
                    WHEN MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status
            FROM nhan_vien nv
            LEFT JOIN tai_khoan tk ON tk.id = nv.tai_khoan_id
            LEFT JOIN cham_cong cc
              ON cc.nhan_vien_id = nv.id
             AND (date(cc.thoi_gian))::date = $1::date
            WHERE tk.vai_tro = 'nhan_vien'
            GROUP BY nv.id, nv.ho_ten, tk.ten_dang_nhap
            ORDER BY nv.id ASC
        `;

        const result = await pool.query(query, [queryDate]);

        res.status(200).json({
            success: true,
            message: 'Lấy tất cả danh sách chấm công thành công.',
            total: result.rowCount,
            data: result.rows
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách chấm công tổng hợp:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// euclideanDistance removed as it's now in faceUtils.js

/**
 * Controller API Xác thực khuôn mặt để chấm công
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const verifyAttendanceFace = async (req, res) => {
    try {
        const { userId, embedding } = req.body;

        if (!userId || !embedding) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu userId hoặc dữ liệu khuôn mặt (embedding).'
            });
        }

        // 1. Lấy dữ liệu khuôn mặt đã lưu trong DB
        const userQuery = `
            SELECT
                nv.id,
                nv.du_lieu_khuon_mat,
                nv.khuon_mat_da_cap_nhat
            FROM nhan_vien nv
            WHERE nv.id = $1 OR nv.tai_khoan_id = $1
            LIMIT 1
        `;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng.'
            });
        }

        const storedData = userResult.rows[0];

        if (!storedData.khuon_mat_da_cap_nhat || !storedData.du_lieu_khuon_mat) {
            return res.status(400).json({
                success: false,
                message: 'Người dùng này chưa cập nhật dữ liệu khuôn mặt.'
            });
        }

        // 2. So sánh embedding gửi lên với 3 góc đã lưu
        const match = findBestMatch(embedding, normalizeEmbedding(storedData.du_lieu_khuon_mat));

        const similarity = match.bestSimilarity;
        const distance = match.bestDistance;

        // Ngưỡng yêu cầu từ người dùng: > 80%
        const minSimilarity = 80;
        const isMatch = similarity >= minSimilarity;

        if (isMatch) {
            return res.status(200).json({
                success: true,
                message: 'Xác thực khuôn mặt thành công.',
                similarity: similarity.toFixed(2) + '%',
                distance: distance.toFixed(4),
                isMatch: true
            });
        } else {
            return res.status(200).json({
                success: false,
                message: `Xác thực khuôn mặt thất bại. Độ tương đồng (${similarity.toFixed(2)}%) thấp hơn yêu cầu (${minSimilarity}%).`,
                similarity: similarity.toFixed(2) + '%',
                distance: distance.toFixed(4),
                isMatch: false
            });
        }

    } catch (error) {
        console.error('Lỗi khi xác thực khuôn mặt chấm công:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

/**
 * Controller API Lấy lịch sử chấm công của 1 nhân viên
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const getEmployeeAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        // Kiểm tra userId hợp lệ
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID người dùng không hợp lệ.'
            });
        }

        const query = `
            SELECT 
                (date(cc.thoi_gian))::date AS log_date,
                TO_CHAR((date(cc.thoi_gian))::date, 'TMDay') AS day_of_week,
                MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') AS check_in_time,
                MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') AS check_out_time,
                CASE
                    WHEN MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') IS NULL THEN 'none'
                    WHEN MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status
            FROM cham_cong cc
            WHERE cc.nhan_vien_id = $1
            GROUP BY (date(cc.thoi_gian))::date
            ORDER BY log_date DESC
        `;

        const result = await pool.query(query, [userId]);

        const formattedData = result.rows.map(row => ({
            ...row,
            // log_date: row.log_date.toISOString().split('T')[0] 
        }));

        res.status(200).json({
            success: true,
            message: 'Lấy lịch sử chấm công thành công.',
            total: result.rowCount,
            data: formattedData
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử chấm công nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

/// API CHẤM CÔng NHÂN VIÊN
