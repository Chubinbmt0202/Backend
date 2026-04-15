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
 */
export const getAttendanceStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { date } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'ID người dùng không hợp lệ.'
            });
        }

        const queryDate = date || new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                $2::date AS log_date,
                cc.gio_vao AS check_in_time,
                cc.gio_ra AS check_out_time,
                CASE
                    WHEN cc.gio_vao IS NULL THEN 'none'
                    WHEN cc.gio_ra IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status
            FROM CHAM_CONG cc
            WHERE cc.id_nhan_vien = $1
              AND cc.gio_vao::date = $2::date
            LIMIT 1
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
 */
export const getAllAttendance = async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date || new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                nv.id_nhan_vien AS employee_id,
                nv.ho_va_ten AS full_name,
                tk.ten_dang_nhap AS username,
                $1::date AS log_date,
                cc.gio_vao AS check_in_time,
                cc.gio_ra AS check_out_time,
                CASE
                    WHEN cc.gio_vao IS NULL THEN 'none'
                    WHEN cc.gio_ra IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status
            FROM NHAN_VIEN nv
            LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
            LEFT JOIN CHAM_CONG cc
              ON cc.id_nhan_vien = nv.id_nhan_vien
             AND cc.gio_vao::date = $1::date
            ORDER BY nv.id_nhan_vien ASC
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

/**
 * Controller API Xác thực khuôn mặt để chấm công
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

        const userQuery = `
            SELECT
                nv.id_nhan_vien,
                nv.du_lieu_khuon_mat
            FROM NHAN_VIEN nv
            WHERE (nv.id_nhan_vien = $1 OR nv.id_tai_khoan = $1) AND nv.du_lieu_khuon_mat IS NOT NULL
            LIMIT 1
        `;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng hoặc người dùng chưa đăng ký khuôn mặt.'
            });
        }

        const storedData = userResult.rows[0];
        const match = findBestMatch(embedding, normalizeEmbedding(storedData.du_lieu_khuon_mat));

        const similarity = match.bestSimilarity;
        const minSimilarity = 80;
        const isMatch = similarity >= minSimilarity;

        if (isMatch) {
            return res.status(200).json({
                success: true,
                message: 'Xác thực khuôn mặt thành công.',
                similarity: similarity.toFixed(2) + '%',
                distance: match.bestDistance.toFixed(4),
                isMatch: true
            });
        } else {
            return res.status(200).json({
                success: false,
                message: `Xác thực khuôn mặt thất bại. Độ tương đồng (${similarity.toFixed(2)}%) thấp hơn yêu cầu (${minSimilarity}%).`,
                similarity: similarity.toFixed(2) + '%',
                distance: match.bestDistance.toFixed(4),
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
 */
export const getEmployeeAttendanceHistory = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'ID người dùng không hợp lệ.'
            });
        }

        const query = `
            SELECT 
                cc.gio_vao::date AS log_date,
                TO_CHAR(cc.gio_vao::date, 'TMDay') AS day_of_week,
                cc.gio_vao AS check_in_time,
                cc.gio_ra AS check_out_time,
                CASE
                    WHEN cc.gio_vao IS NULL THEN 'none'
                    WHEN cc.gio_ra IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status
            FROM CHAM_CONG cc
            WHERE cc.id_nhan_vien = $1
            ORDER BY cc.gio_vao DESC
        `;

        const result = await pool.query(query, [userId]);

        res.status(200).json({
            success: true,
            message: 'Lấy lịch sử chấm công thành công.',
            total: result.rowCount,
            data: result.rows
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử chấm công nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

