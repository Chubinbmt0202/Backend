import pool from '../config/db.js';

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
