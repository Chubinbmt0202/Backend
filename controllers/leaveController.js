import pool from '../config/db.js';
import supabase from '../config/supabaseClient.js';
import { generateId } from '../utils/idGenerator.js';

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
            id_nhan_vien
        } = req.body;

        if (!id_nhan_vien || !leaveType || !fromDate || !toDate) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin: id_nhan_vien, leaveType, fromDate, toDate.'
            });
        }

        let url_minh_chung = null;

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

