import pool from '../config/db.js';
import { findBestMatch } from '../utils/faceUtils.js';

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
                log_date,
                check_in_time,
                check_out_time,
                status
            FROM attendance_logs
            WHERE user_id = $1 AND log_date = $2
        `;

        const result = await pool.query(query, [userId, queryDate]);

        if (result.rowCount === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không tìm thấy dữ liệu chấm công cho ngày này.',
                data: {
                    log_date: queryDate,
                    check_in_time: null,
                    check_out_time: null,
                    status: 'none'
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu chấm công thành công.',
            data: result.rows[0]
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
        const query = `
            SELECT 
                u.id AS employee_id,
                u.full_name,
                u.username,
                al.log_date,
                al.check_in_time,
                al.check_out_time,
                al.status
            FROM users u
            LEFT JOIN attendance_logs al ON u.id = al.user_id
            WHERE u.role = 'employee'
            ORDER BY al.log_date DESC NULLS LAST, u.id ASC
        `;

        const result = await pool.query(query);

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
        const userQuery = `SELECT face_mesh_data, is_face_updated FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng.'
            });
        }

        const storedData = userResult.rows[0];

        if (!storedData.is_face_updated || !storedData.face_mesh_data) {
            return res.status(400).json({
                success: false,
                message: 'Người dùng này chưa cập nhật dữ liệu khuôn mặt.'
            });
        }

        // 2. So sánh embedding gửi lên với 3 góc đã lưu
        const match = findBestMatch(embedding, storedData.face_mesh_data);
        
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
                log_date,
                TO_CHAR(log_date, 'TMDay') AS day_of_week,
                check_in_time,
                check_out_time,
                status
            FROM attendance_logs
            WHERE user_id = $1
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
