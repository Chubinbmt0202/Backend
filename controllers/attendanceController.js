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

        // 1. Query all active employees
        const empQuery = `
            SELECT 
                nv.id_nhan_vien AS employee_id,
                nv.ho_va_ten AS full_name,
                tk.ten_dang_nhap AS username
            FROM NHAN_VIEN nv
            LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
            ORDER BY nv.id_nhan_vien ASC
        `;
        const empResult = await pool.query(empQuery);

        // 2. Query all CHAM_CONG records for this day
        const attQuery = `
            SELECT id_cham_cong, id_nhan_vien, gio_vao, gio_ra, ghi_chu, url_anh_vao, url_anh_ra
            FROM CHAM_CONG
            WHERE gio_vao::date = $1::date
            ORDER BY gio_vao ASC
        `;
        const attResult = await pool.query(attQuery, [queryDate]);

        // 3. Query all DON_DANG_KY_OT records for this day
        const otQuery = `
            SELECT id_don_ot, id_nhan_vien, ngay_dang_ky_ot, gio_bat_dau, gio_ket_thuc_du_kien, ly_do, trang_thai
            FROM DON_DANG_KY_OT
            WHERE ngay_dang_ky_ot = $1::date
        `;
        const otResult = await pool.query(otQuery, [queryDate]);

        // Grouping
        const attendanceMap = new Map();
        attResult.rows.forEach(row => {
            if (!attendanceMap.has(row.id_nhan_vien)) {
                attendanceMap.set(row.id_nhan_vien, []);
            }
            attendanceMap.get(row.id_nhan_vien).push(row);
        });

        const otMap = new Map();
        otResult.rows.forEach(row => {
            otMap.set(row.id_nhan_vien, row);
        });

        const mergedData = empResult.rows.map(emp => {
            const empId = emp.employee_id;
            const logs = attendanceMap.get(empId) || [];
            const ot = otMap.get(empId) || null;

            let check_in_time = null;
            let check_out_time = null;
            let status = null;

            let has_ot = ot !== null;
            let ot_start_time = ot ? ot.gio_bat_dau : null;
            let ot_expected_end_time = ot ? ot.gio_ket_thuc_du_kien : null;
            let ot_reason = ot ? ot.ly_do : null;
            let ot_status = ot ? ot.trang_thai : null;
            let ot_check_in_time = null;
            let ot_check_out_time = null;

            // If employee has registered OT and it's approved, we categorize check-ins
            if (ot && ot.trang_thai === 'DA_DUYET') {
                const otStartParts = ot.gio_bat_dau.split(':');
                const otStartHour = parseInt(otStartParts[0], 10);
                const otStartMin = parseInt(otStartParts[1], 10);
                const otStartMinutes = otStartHour * 60 + otStartMin;

                const otLogs = [];
                const normalLogs = [];

                if (logs.length >= 2) {
                    // Sắp xếp theo giờ vào tăng dần
                    logs.sort((a, b) => new Date(a.gio_vao).getTime() - new Date(b.gio_vao).getTime());
                    normalLogs.push(logs[0]);
                    otLogs.push(logs[1]);
                } else if (logs.length === 1) {
                    const log = logs[0];
                    const logDate = new Date(log.gio_vao);

                    // Lấy giờ Việt Nam
                    const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(logDate);
                    const hour = parseInt(hourStr, 10) === 24 ? 0 : parseInt(hourStr, 10);

                    const isOtByNote = log.ghi_chu && (log.ghi_chu.toLowerCase().includes("tăng ca") || log.ghi_chu.toLowerCase().includes("ot"));

                    if (hour >= 16 || isOtByNote) {
                        otLogs.push(log);
                    } else {
                        normalLogs.push(log);
                    }
                }

                if (normalLogs.length > 0) {
                    check_in_time = normalLogs[0].gio_vao;
                    check_out_time = normalLogs[0].gio_ra;
                }

                if (otLogs.length > 0) {
                    ot_check_in_time = otLogs[0].gio_vao;
                    ot_check_out_time = otLogs[0].gio_ra;
                }
            } else {
                // No approved OT, all logs are normal shift
                if (logs.length > 0) {
                    check_in_time = logs[0].gio_vao;
                    check_out_time = logs[0].gio_ra;
                }
            }

            // Determine normal status
            if (check_in_time === null) {
                status = null;
            } else if (check_out_time === null) {
                status = 'checked_in';
            } else {
                status = 'checked_out';
            }

            return {
                employee_id: empId,
                full_name: emp.full_name,
                username: emp.username,
                log_date: queryDate,
                check_in_time,
                check_out_time,
                status,
                has_ot,
                ot_start_time,
                ot_expected_end_time,
                ot_reason,
                ot_status,
                ot_check_in_time,
                ot_check_out_time,
                url_anh_vao: logs.length > 0 ? logs[0].url_anh_vao : null,
                url_anh_ra: logs.length > 0 ? logs[logs.length - 1].url_anh_ra : null
            };
        });

        res.status(200).json({
            success: true,
            message: 'Lấy tất cả danh sách chấm công thành công.',
            total: mergedData.length,
            data: mergedData
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

        // 1. Fetch employee info to verify existence
        const empQuery = `SELECT id_nhan_vien FROM NHAN_VIEN WHERE id_nhan_vien = $1 OR id_tai_khoan = $1 LIMIT 1`;
        const empResult = await pool.query(empQuery, [userId]);
        if (empResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên.'
            });
        }
        const empId = empResult.rows[0].id_nhan_vien;

        // 2. Fetch all CHAM_CONG logs for the employee
        const attQuery = `
            SELECT id_cham_cong, gio_vao, gio_ra, ghi_chu, url_anh_vao, url_anh_ra
            FROM CHAM_CONG
            WHERE id_nhan_vien = $1
            ORDER BY gio_vao DESC
        `;
        const attResult = await pool.query(attQuery, [empId]);

        // 3. Fetch all DON_DANG_KY_OT for the employee
        const otQuery = `
            SELECT id_don_ot, ngay_dang_ky_ot, gio_bat_dau, gio_ket_thuc_du_kien, ly_do, trang_thai
            FROM DON_DANG_KY_OT
            WHERE id_nhan_vien = $1
            ORDER BY ngay_dang_ky_ot DESC
        `;
        const otResult = await pool.query(otQuery, [empId]);

        // 4. Fetch all GIAI_TRINH_DI_TRE for the employee
        const explQuery = `
            SELECT id_giai_trinh, ngay_giai_trinh, gio_vao_tre, ly_do, trang_thai
            FROM GIAI_TRINH_DI_TRE
            WHERE id_nhan_vien = $1
            ORDER BY ngay_giai_trinh DESC
        `;
        const explResult = await pool.query(explQuery, [empId]);

        // Group by local date YYYY-MM-DD
        const dailyDataMap = new Map();

        const getLocalDateString = (dateObj) => {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        attResult.rows.forEach(row => {
            const dateStr = getLocalDateString(new Date(row.gio_vao));
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, { logs: [], ot: null });
            }
            dailyDataMap.get(dateStr).logs.push(row);
        });

        otResult.rows.forEach(row => {
            let dateStr = row.ngay_dang_ky_ot;
            if (row.ngay_dang_ky_ot instanceof Date) {
                dateStr = getLocalDateString(row.ngay_dang_ky_ot);
            } else if (typeof row.ngay_dang_ky_ot === 'string') {
                dateStr = row.ngay_dang_ky_ot.split('T')[0];
            }
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, { logs: [], ot: null, explanation: null });
            }
            dailyDataMap.get(dateStr).ot = row;
        });

        explResult.rows.forEach(row => {
            let dateStr = row.ngay_giai_trinh;
            if (row.ngay_giai_trinh instanceof Date) {
                dateStr = getLocalDateString(row.ngay_giai_trinh);
            } else if (typeof row.ngay_giai_trinh === 'string') {
                dateStr = row.ngay_giai_trinh.split('T')[0];
            }
            if (!dailyDataMap.has(dateStr)) {
                dailyDataMap.set(dateStr, { logs: [], ot: null, explanation: null });
            }
            dailyDataMap.get(dateStr).explanation = row;
        });

        const historyList = [];
        dailyDataMap.forEach((val, dateStr) => {
            const logs = val.logs;
            const ot = val.ot;

            logs.reverse();

            let check_in_time = null;
            let check_out_time = null;
            let status = null;

            let has_ot = ot !== null;
            let ot_start_time = ot ? ot.gio_bat_dau : null;
            let ot_expected_end_time = ot ? ot.gio_ket_thuc_du_kien : null;
            let ot_reason = ot ? ot.ly_do : null;
            let ot_status = ot ? ot.trang_thai : null;
            let ot_check_in_time = null;
            let ot_check_out_time = null;

            if (ot && ot.trang_thai === 'DA_DUYET') {
                const otStartParts = ot.gio_bat_dau.split(':');
                const otStartHour = parseInt(otStartParts[0], 10);
                const otStartMin = parseInt(otStartParts[1], 10);
                const otStartMinutes = otStartHour * 60 + otStartMin;

                const otLogs = [];
                const normalLogs = [];

                if (logs.length >= 2) {
                    // Sắp xếp theo giờ vào tăng dần
                    logs.sort((a, b) => new Date(a.gio_vao).getTime() - new Date(b.gio_vao).getTime());
                    normalLogs.push(logs[0]);
                    otLogs.push(logs[1]);
                } else if (logs.length === 1) {
                    const log = logs[0];
                    const logDate = new Date(log.gio_vao);

                    // Lấy giờ Việt Nam
                    const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(logDate);
                    const hour = parseInt(hourStr, 10) === 24 ? 0 : parseInt(hourStr, 10);

                    const isOtByNote = log.ghi_chu && (log.ghi_chu.toLowerCase().includes("tăng ca") || log.ghi_chu.toLowerCase().includes("ot"));

                    if (hour >= 16 || isOtByNote) {
                        otLogs.push(log);
                    } else {
                        normalLogs.push(log);
                    }
                }

                if (normalLogs.length > 0) {
                    check_in_time = normalLogs[0].gio_vao;
                    check_out_time = normalLogs[0].gio_ra;
                }

                if (otLogs.length > 0) {
                    ot_check_in_time = otLogs[0].gio_vao;
                    ot_check_out_time = otLogs[0].gio_ra;
                }
            } else {
                if (logs.length > 0) {
                    check_in_time = logs[0].gio_vao;
                    check_out_time = logs[0].gio_ra;
                }
            }

            if (check_in_time === null) {
                status = null;
            } else {
                const inDate = new Date(check_in_time);
                const options = { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', minute: 'numeric', hour12: false };
                const formatter = new Intl.DateTimeFormat('en-US', options);
                const parts = formatter.formatToParts(inDate);
                const h = parseInt(parts.find(p => p.type === 'hour').value, 10) % 24;
                const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
                
                if (h * 60 + m > 8 * 60) {
                    status = 'late';
                } else {
                    status = 'present';
                }
            }

            historyList.push({
                log_date: dateStr,
                check_in_time,
                check_out_time,
                status,
                has_ot,
                ot_start_time,
                ot_expected_end_time,
                ot_reason,
                ot_status,
                ot_check_in_time,
                ot_check_out_time,
                url_anh_vao: logs.length > 0 ? logs[logs.length - 1].url_anh_vao : null,
                url_anh_ra: logs.length > 0 ? logs[0].url_anh_ra : null,
                explanation: val.explanation
            });
        });

        historyList.sort((a, b) => b.log_date.localeCompare(a.log_date));

        res.status(200).json({
            success: true,
            message: 'Lấy lịch sử chấm công thành công.',
            total: historyList.length,
            data: historyList
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử chấm công nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

/**
 * Lấy danh sách tất cả giải trình đi trễ (cho HR/Admin)
 */
export const getLateExplanations = async (req, res) => {
    try {
        const query = `
            SELECT 
                gt.*, 
                nv.ho_va_ten AS ho_ten_nhan_vien,
                nv.id_phong_ban,
                pb.ten_phong_ban,
                nv_duyet.ho_va_ten AS ten_nguoi_duyet
            FROM GIAI_TRINH_DI_TRE gt
            LEFT JOIN NHAN_VIEN nv ON gt.id_nhan_vien = nv.id_nhan_vien
            LEFT JOIN PHONG_BAN pb ON nv.id_phong_ban = pb.id_phong_ban
            LEFT JOIN NHAN_VIEN nv_duyet ON gt.id_nguoi_duyet = nv_duyet.id_nhan_vien
            ORDER BY gt.ngay_tao DESC
        `;
        const result = await pool.query(query);
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách giải trình đi trễ:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách giải trình.'
        });
    }
};

/**
 * Lấy danh sách giải trình đi trễ của 1 nhân viên
 */
export const getEmployeeLateExplanations = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const query = `
            SELECT 
                gt.*, 
                nv_duyet.ho_va_ten AS ten_nguoi_duyet
            FROM GIAI_TRINH_DI_TRE gt
            LEFT JOIN NHAN_VIEN nv_duyet ON gt.id_nguoi_duyet = nv_duyet.id_nhan_vien
            WHERE gt.id_nhan_vien = $1
            ORDER BY gt.ngay_tao DESC
        `;
        const result = await pool.query(query, [employeeId]);
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử giải trình nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch sử giải trình.'
        });
    }
};

/**
 * Cập nhật trạng thái giải trình đi trễ (Duyệt/Từ chối)
 */
export const updateLateExplanationStatus = async (req, res) => {
    try {
        const { id_giai_trinh, status, id_nguoi_duyet, ghi_chu } = req.body;
        if (!id_giai_trinh || status === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp id_giai_trinh và status.'
            });
        }

        const dbStatus = status === 'approved' ? true : status === 'rejected' ? false : null;

        const query = `
            UPDATE GIAI_TRINH_DI_TRE 
            SET trang_thai = $1, 
                id_nguoi_duyet = $2, 
                ngay_duyet = CURRENT_TIMESTAMP,
                ghi_chu = $3
            WHERE id_giai_trinh = $4
            RETURNING *;
        `;
        const result = await pool.query(query, [dbStatus, id_nguoi_duyet, ghi_chu || '', id_giai_trinh]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giải trình.'
            });
        }

        // Gửi thông báo cho nhân viên về kết quả duyệt đơn giải trình
        try {
            const { createNotificationHelper } = await import('./notificationController.js');
            const giaiTrinh = result.rows[0];
            const statusText = status === 'approved' ? 'chấp thuận' : 'từ chối';
            await createNotificationHelper(
                giaiTrinh.id_nhan_vien,
                "Kết quả giải trình đi trễ 📝",
                `Giải trình đi trễ ngày ${new Date(giaiTrinh.ngay_giai_trinh).toLocaleDateString('vi-VN')} của bạn đã được ${statusText}.`,
                "LATE_EXPLANATION_STATUS"
            );
        } catch (notiErr) {
            console.error('Lỗi gửi thông báo kết quả giải trình:', notiErr.message);
        }

        res.status(200).json({
            success: true,
            message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} giải trình.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái giải trình:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái giải trình.'
        });
    }
};

/**
 * Controller API Lấy thống kê xu hướng chấm công (Trend)
 */
export const getAttendanceTrend = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        // 1. Thống kê theo ngày (7 ngày gần nhất)
        const trendQuery = `
            SELECT 
                log_date,
                COUNT(DISTINCT id_nhan_vien) AS total_present
            FROM (
                SELECT id_nhan_vien, TO_CHAR(gio_vao, 'YYYY-MM-DD') AS log_date
                FROM CHAM_CONG
                WHERE gio_vao >= CURRENT_DATE - ($1 || ' days')::interval
            ) sub
            GROUP BY log_date
            ORDER BY log_date ASC
        `;
        
        const trendResult = await pool.query(trendQuery, [days]);

        // 2. Tỷ lệ đi muộn theo phòng ban hôm nay (hoặc 7 ngày)
        const lateByDeptQuery = `
            SELECT 
                pb.ten_phong_ban,
                COUNT(cc.id_cham_cong) AS late_count
            FROM CHAM_CONG cc
            JOIN NHAN_VIEN nv ON cc.id_nhan_vien = nv.id_nhan_vien
            JOIN PHONG_BAN pb ON nv.id_phong_ban = pb.id_phong_ban
            WHERE cc.gio_vao >= CURRENT_DATE - ($1 || ' days')::interval
              AND (EXTRACT(HOUR FROM cc.gio_vao) * 60 + EXTRACT(MINUTE FROM cc.gio_vao) > 8 * 60)
            GROUP BY pb.ten_phong_ban
        `;
        
        const lateByDeptResult = await pool.query(lateByDeptQuery, [days]);

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
