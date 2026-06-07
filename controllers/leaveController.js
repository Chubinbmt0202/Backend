import pool from '../config/db.js';
import supabase from '../config/supabaseClient.js';
import { generateId } from '../utils/idGenerator.js';
import { createNotificationHelper } from './notificationController.js';
import admin from '../config/firebase.js';

// Helper function to convert DD/MM/YYYY to YYYY-MM-DD
const formatDateForDB = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};

// Map leave type names to IDs (fallback if client doesn't send ID)
const mapLeaveTypeToId = async (typeName) => {
    try {
        const result = await pool.query(
            'SELECT id_loai_phep FROM LOAI_PHEP WHERE ten_phep ILIKE $1 LIMIT 1',
            [`%${typeName}%`]
        );
        return result.rows[0]?.id_loai_phep || 'LP001'; // Default to LP001 if not found
    } catch (error) {
        console.error('Error mapping leave type:', error);
        return 'LP001';
    }
};

export const createLeaveRequest = async (req, res) => {
    try {
        const {
            leaveType,
            fromDate,
            toDate,
            reason,
            id_nhan_vien,
            url_minh_chung: body_url_minh_chung
        } = req.body;

        if (!id_nhan_vien || !leaveType || !fromDate || !toDate) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin: id_nhan_vien, leaveType, fromDate, toDate.'
            });
        }

        let url_minh_chung = body_url_minh_chung || null;


        // 1. Handle file upload if exists
        if (req.file) {
            const file = req.file;
            const timestamp = Date.now();
            const fileName = `leave_requests/${id_nhan_vien}/${timestamp}_${file.originalname.replace(/\s+/g, '_')}`;

            const { data, error } = await supabase.storage
                .from('uploads')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('Lỗi upload Supabase:', error.message);
                // Continue without file or return error? Let's return error for now.
                return res.status(500).json({ success: false, message: 'Lỗi khi tải file minh chứng lên.' });
            }

            const { data: publicUrlData } = supabase.storage
                .from('uploads')
                .getPublicUrl(fileName);
            
            url_minh_chung = publicUrlData.publicUrl;
        }

        // 2. Map leave type name to ID
        const id_loai_phep = await mapLeaveTypeToId(leaveType);

        // 3. Parse dates
        const dbFromDate = formatDateForDB(fromDate);
        const dbToDate = formatDateForDB(toDate);

        // 4. Generate ID and Insert
        const id_don_xin_nghi = generateId('DN');

        const query = `
            INSERT INTO DON_XIN_NGHI (
                id_don_xin_nghi, 
                id_nguoi_dung, 
                id_loai_phep, 
                ngay_bat_dau, 
                ngay_ket_thuc, 
                ly_do, 
                trang_thai, 
                ngay_tao,
                url_minh_chung
            )
            VALUES ($1, $2, $3, $4, $5, $6, NULL, CURRENT_TIMESTAMP, $7)
            RETURNING *;
        `;

        const values = [
            id_don_xin_nghi,
            id_nhan_vien,
            id_loai_phep,
            dbFromDate,
            dbToDate,
            reason || '',
            url_minh_chung
        ];

        const result = await pool.query(query, values);

        // Gửi thông báo cho tất cả Admin/HR
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
            const empResult = await pool.query(empQuery, [id_nhan_vien]);
            const empName = empResult.rows[0]?.ho_va_ten || "Một nhân viên";

            for (const hr of hrResult.rows) {
                await createNotificationHelper(
                    hr.id_nhan_vien,
                    "Đơn xin nghỉ mới 📩",
                    `${empName} vừa gửi một đơn xin nghỉ phép. Vui lòng kiểm tra và duyệt.`,
                    "LEAVE_REQUEST"
                );
            }

            // Đồng bộ lên kênh admin_notifications cho Web App (AdminTime)
            const notifId = generateId('TB');
            await admin.database().ref(`admin_notifications/${notifId}`).set({
                id_thong_bao: notifId,
                id_nhan_vien: id_nhan_vien,
                ho_ten_nhan_vien: empName,
                tieu_de: "Đơn xin nghỉ mới 📩",
                noi_dung: `${empName} vừa gửi một đơn xin nghỉ phép. Vui lòng kiểm tra và duyệt.`,
                loai_thong_bao: "LEAVE_REQUEST",
                da_doc: false,
                ngay_tao: Date.now()
            });
            console.log(`🔥 Đã đồng bộ thông báo lên kênh admin_notifications cho Web App`);

        } catch (notiErr) {
            console.error('Lỗi khi gửi thông báo đơn xin nghỉ cho HR:', notiErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Tạo đơn xin nghỉ thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi tạo đơn xin nghỉ:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

export const getEmployeeLeaves = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const query = `
            SELECT 
                dxn.*, 
                lp.ten_phep,
                nv_duyet.ho_va_ten as ten_nguoi_duyet
            FROM DON_XIN_NGHI dxn
            LEFT JOIN LOAI_PHEP lp ON dxn.id_loai_phep = lp.id_loai_phep
            LEFT JOIN NHAN_VIEN nv_duyet ON dxn.id_nguoi_duyet = nv_duyet.id_nhan_vien
            WHERE dxn.id_nguoi_dung = $1
            ORDER BY dxn.ngay_tao DESC
        `;

        const result = await pool.query(query, [employeeId]);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử nghỉ phép:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server.'
        });
    }
};

export const getAllLeaveRequests = async (req, res) => {
    try {
        const query = `
            SELECT 
                dxn.*, 
                lp.ten_phep,
                nv.ho_va_ten as ho_ten_nhan_vien,
                nv.id_phong_ban,
                pb.ten_phong_ban,
                nv_duyet.ho_va_ten as ten_nguoi_duyet
            FROM DON_XIN_NGHI dxn
            LEFT JOIN NHAN_VIEN nv ON dxn.id_nguoi_dung = nv.id_nhan_vien
            LEFT JOIN PHONG_BAN pb ON nv.id_phong_ban = pb.id_phong_ban
            LEFT JOIN LOAI_PHEP lp ON dxn.id_loai_phep = lp.id_loai_phep
            LEFT JOIN NHAN_VIEN nv_duyet ON dxn.id_nguoi_duyet = nv_duyet.id_nhan_vien
            ORDER BY dxn.ngay_tao DESC
        `;

        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            message: 'Lấy tất cả đơn xin nghỉ thành công',
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách tất cả đơn xin nghỉ:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách đơn xin nghỉ.'
        });
    }
};

export const updateLeaveStatus = async (req, res) => {
    try {
        const { id_don_xin_nghi, status, id_nguoi_duyet, ghi_chu } = req.body;

        if (!id_don_xin_nghi || status === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp id_don_xin_nghi và status.'
            });
        }

        // status: 'approved' -> true, 'rejected' -> false
        const dbStatus = status === 'approved' ? true : status === 'rejected' ? false : null;

        const query = `
            UPDATE DON_XIN_NGHI 
            SET trang_thai = $1, 
                id_nguoi_duyet = $2, 
                ngay_duyet = CURRENT_TIMESTAMP,
                ghi_chu = $3
            WHERE id_don_xin_nghi = $4
            RETURNING *;
        `;

        const result = await pool.query(query, [dbStatus, id_nguoi_duyet, ghi_chu || '', id_don_xin_nghi]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn xin nghỉ.'
            });
        }

        // Gửi thông báo cho nhân viên về kết quả duyệt đơn
        try {
            const donXinNghi = result.rows[0];
            const trangThaiStr = status === 'approved' ? 'chấp thuận' : 'từ chối';
            await createNotificationHelper(
                donXinNghi.id_nguoi_dung,
                "Kết quả đơn xin nghỉ 📝",
                `Đơn xin nghỉ phép của bạn đã bị ${trangThaiStr}. Vui lòng kiểm tra lại.`,
                "LEAVE_STATUS"
            );
        } catch (notiErr) {
            console.error('Lỗi khi gửi thông báo kết quả đơn xin nghỉ:', notiErr.message);
        }

        res.status(200).json({
            success: true,
            message: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} đơn xin nghỉ.`,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái đơn xin nghỉ:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái.'
        });
    }
};

export const getAllLeaveTypes = async (req, res) => {
    try {
        const query = `SELECT * FROM LOAI_PHEP ORDER BY id_loai_phep ASC`;
        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách loại phép:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách loại phép.'
        });
    }
};

export const updateLeaveType = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_phep, so_ngay_toi_da, co_luong, mo_ta } = req.body;

        if (!id || !ten_phep || so_ngay_toi_da === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đủ thông tin (ten_phep, so_ngay_toi_da).'
            });
        }

        const query = `
            UPDATE LOAI_PHEP
            SET ten_phep = $1, so_ngay_toi_da = $2, co_luong = $3, mo_ta = $4
            WHERE id_loai_phep = $5
            RETURNING *;
        `;
        const values = [ten_phep, so_ngay_toi_da, co_luong || false, mo_ta || '', id];
        
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại phép.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật loại phép thành công.',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật loại phép:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật loại phép.'
        });
    }
};

