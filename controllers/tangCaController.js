import pool from '../config/db.js';
import admin from '../config/firebase.js';
import { taoId } from '../utils/tienIchTaoId.js';
import { taoThongBaoHelper } from './thongBaoController.js';

export const taoDonTangCa = async (req, res) => {
    try {
        const { employeeId, otDate, startTime, expectedEndTime, reason } = req.body;
        
        if (!employeeId || !otDate || !startTime || !expectedEndTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc (Ngày, Giờ bắt đầu, Giờ kết thúc dự kiến).' 
            });
        }

        // Kiểm tra xem nhân viên đã hoàn thành chấm công ca chính trong ngày otDate chưa
        const mainShiftQuery = `
            SELECT gio_vao, gio_ra 
            FROM CHAM_CONG 
            WHERE id_nhan_vien = $1 AND gio_vao::date = $2::date
              AND (ghi_chu IS NULL OR NOT (ghi_chu ILIKE '%tăng ca%' OR ghi_chu ILIKE '%ot%'))
            LIMIT 1;
        `;
        const mainShiftResult = await pool.query(mainShiftQuery, [employeeId, otDate]);
        
        if (mainShiftResult.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chưa hoàn thành chấm công của ca chính trong ngày đăng ký tăng ca này. Vui lòng chấm công vào và ra ca chính trước.'
            });
        }
        
        const mainShift = mainShiftResult.rows[0];
        if (!mainShift.gio_ra) {
            return res.status(400).json({
                success: false,
                message: 'Bạn chưa chấm công ra cho ca chính. Vui lòng hoàn thành chấm công ra ca chính trước khi đăng ký tăng ca.'
            });
        }

        // Kiểm tra xem nhân viên đã đăng ký tăng ca trong ngày này chưa
        const checkQuery = `
            SELECT id_don_ot FROM DON_DANG_KY_OT 
            WHERE id_nhan_vien = $1 AND ngay_dang_ky_ot = $2
            LIMIT 1;
        `;
        const existingOT = await pool.query(checkQuery, [employeeId, otDate]);
        
        if (existingOT.rowCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã đăng ký tăng ca cho ngày này rồi. Mỗi ngày chỉ được đăng ký tối đa 1 lần.'
            });
        }

        const idDonOt = taoId('OT');
        
        const query = `
            INSERT INTO DON_DANG_KY_OT (id_don_ot, id_nhan_vien, ngay_dang_ky_ot, gio_bat_dau, gio_ket_thuc_du_kien, ly_do, trang_thai)
            VALUES ($1, $2, $3, $4, $5, $6, 'CHO_DUYET')
            RETURNING *;
        `;
        const result = await pool.query(query, [idDonOt, employeeId, otDate, startTime, expectedEndTime, reason || '']);
        
        // Gửi thông báo cho tất cả Admin/HR và đồng bộ Firebase Realtime DB
        try {
            const getHrQuery = `
                SELECT nv.id_nhan_vien 
                FROM NHAN_VIEN nv
                JOIN TAI_KHOAN tk ON nv.id_tai_khoan = tk.id_tai_khoan
                JOIN VAI_TRO vt ON tk.id_vai_tro = vt.id_vai_tro
                WHERE vt.ten_vai_tro ILIKE '%Admin%' OR vt.ten_vai_tro ILIKE '%HR%' OR vt.ten_vai_tro ILIKE '%Nhân sự%'
            `;
            const hrResult = await pool.query(getHrQuery);
            
            // Lấy tên người gửi
            const empQuery = `SELECT ho_va_ten FROM NHAN_VIEN WHERE id_nhan_vien = $1`;
            const empResult = await pool.query(empQuery, [employeeId]);
            const empName = empResult.rows[0]?.ho_va_ten || "Một nhân viên";

            for (const hr of hrResult.rows) {
                await taoThongBaoHelper(
                    hr.id_nhan_vien,
                    "Đơn xin tăng ca mới 📩",
                    `${empName} vừa gửi một đơn đăng ký tăng ca. Vui lòng kiểm tra và duyệt.`,
                    "OVERTIME_REQUEST"
                );
            }

            // Đồng bộ lên kênh admin_notifications cho Web App (AdminTime)
            const notifId = taoId('TB');
            await admin.database().ref(`admin_notifications/${notifId}`).set({
                id_thong_bao: notifId,
                id_nhan_vien: employeeId,
                ho_ten_nhan_vien: empName,
                tieu_de: "Đơn xin tăng ca mới 📩",
                noi_dung: `${empName} vừa gửi một đơn đăng ký tăng ca. Vui lòng kiểm tra và duyệt.`,
                loai_thong_bao: "OVERTIME_REQUEST",
                da_doc: false,
                ngay_tao: Date.now()
            });
            console.log(`🔥 Đã đồng bộ thông báo tăng ca lên kênh admin_notifications cho Web App`);

        } catch (notiErr) {
            console.error('Lỗi khi gửi thông báo đơn xin tăng ca cho HR:', notiErr.message);
        }
        
        res.status(201).json({
            success: true,
            message: 'Đăng ký tăng ca thành công!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi khi tạo đơn OT:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi đăng ký tăng ca.',
            error: error.message 
        });
    }
};

export const layTatCaDonTangCa = async (req, res) => {
    try {
        const query = `
            SELECT 
                ot.*, 
                nv.ho_va_ten,
                nv.id_phong_ban,
                pb.ten_phong_ban
            FROM DON_DANG_KY_OT ot
            LEFT JOIN NHAN_VIEN nv ON ot.id_nhan_vien = nv.id_nhan_vien
            LEFT JOIN PHONG_BAN pb ON nv.id_phong_ban = pb.id_phong_ban
            ORDER BY ot.ngay_tao DESC
        `;

        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            message: 'Lấy tất cả đơn xin tăng ca thành công',
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn tăng ca:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách đơn tăng ca.'
        });
    }
};

export const capNhatTrangThaiTangCa = async (req, res) => {
    try {
        const { id_don_ot, status, ghi_chu } = req.body;

        if (!id_don_ot || status === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp id_don_ot và status.'
            });
        }

        const query = `
            UPDATE DON_DANG_KY_OT 
            SET trang_thai = $1
            WHERE id_don_ot = $2
            RETURNING *;
        `;

        // We assume status is 'DA_DUYET' or 'TU_CHOI'
        const result = await pool.query(query, [status, id_don_ot]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn đăng ký tăng ca.'
            });
        }

        // Gửi thông báo cho nhân viên về kết quả duyệt đơn
        try {
            const donOT = result.rows[0];
            const trangThaiStr = status === 'DA_DUYET' ? 'chấp thuận' : 'từ chối';
            await taoThongBaoHelper(
                donOT.id_nhan_vien,
                "Kết quả đơn đăng ký tăng ca 📝",
                `Đơn xin tăng ca của bạn vào ngày ${new Date(donOT.ngay_dang_ky_ot).toLocaleDateString('vi-VN')} đã bị ${trangThaiStr}. ${ghi_chu ? `Ghi chú: ${ghi_chu}` : ''}`,
                "OT_STATUS"
            );
        } catch (notiErr) {
            console.error('Lỗi khi gửi thông báo kết quả đơn OT:', notiErr.message);
        }

        res.status(200).json({
            success: true,
            message: `Đã ${status === 'DA_DUYET' ? 'phê duyệt' : 'từ chối'} đơn tăng ca.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái đơn OT:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái.'
        });
    }
};

export const layDonTangCaNhanVien = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const query = `
            SELECT * FROM DON_DANG_KY_OT
            WHERE id_nhan_vien = $1
            ORDER BY ngay_dang_ky_ot DESC, gio_bat_dau DESC
        `;

        const result = await pool.query(query, [employeeId]);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử đăng ký OT:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch sử đăng ký OT.'
        });
    }
};
