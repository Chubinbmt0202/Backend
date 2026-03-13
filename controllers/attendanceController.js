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
