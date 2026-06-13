// Script to add getAttendanceTrend
const fs = require('fs');

const controllerPath = 'd:\\New folder\\Backend\\controllers\\attendanceController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const newCode = `
/**
 * Lấy thống kê chấm công (Attendance Trend)
 */
export const getAttendanceTrend = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        // 1. Thống kê theo ngày (7 ngày gần nhất)
        const trendQuery = \`
            SELECT 
                log_date,
                COUNT(DISTINCT id_nhan_vien) AS total_present
            FROM (
                SELECT id_nhan_vien, gio_vao::date AS log_date
                FROM CHAM_CONG
                WHERE gio_vao >= CURRENT_DATE - INTERVAL '\${parseInt(days)} days'
            ) sub
            GROUP BY log_date
            ORDER BY log_date ASC
        \`;
        
        const trendResult = await pool.query(trendQuery);

        // 2. Tỷ lệ đi muộn theo phòng ban hôm nay (hoặc 7 ngày)
        // Để đơn giản, ta xét trong 7 ngày qua ai đi muộn
        const lateByDeptQuery = \`
            SELECT 
                pb.ten_phong_ban,
                COUNT(cc.id_cham_cong) AS late_count
            FROM CHAM_CONG cc
            JOIN NHAN_VIEN nv ON cc.id_nhan_vien = nv.id_nhan_vien
            JOIN PHONG_BAN pb ON nv.id_phong_ban = pb.id_phong_ban
            WHERE cc.gio_vao >= CURRENT_DATE - INTERVAL '\${parseInt(days)} days'
              AND (EXTRACT(HOUR FROM cc.gio_vao) * 60 + EXTRACT(MINUTE FROM cc.gio_vao) > 8 * 60) 
              -- Giả sử sau 8:00 là đi muộn
            GROUP BY pb.ten_phong_ban
        \`;
        
        const lateByDeptResult = await pool.query(lateByDeptQuery);

        res.status(200).json({
            success: true,
            data: {
                trend: trendResult.rows,
                lateByDept: lateByDeptResult.rows
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê chấm công:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê chấm công.'
        });
    }
};
`;

content += newCode;

fs.writeFileSync(controllerPath, content);
console.log('Successfully added getAttendanceTrend to attendanceController.js');
