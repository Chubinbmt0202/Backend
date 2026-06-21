import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

// Helper: Chuyển "HH:mm" thành timestamp hợp lệ cho PostgreSQL
const timeToTimestamp = (timeStr) => {
    if (!timeStr) return null;
    // Nếu đã là timestamp đầy đủ thì giữ nguyên
    if (timeStr.length > 5) return timeStr;
    // Chuyển "08:00" → "1970-01-01 08:00:00"
    return `1970-01-01 ${timeStr}:00`;
};

// Helper: Chuyển timestamp từ DB thành "HH:mm" cho frontend
const timestampToTime = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

// Helper: Format tất cả trường giờ trong 1 shift row
const formatShiftTimes = (row) => {
    if (!row) return row;
    return {
        ...row,
        start_time: timestampToTime(row.start_time),
        end_time: timestampToTime(row.end_time),
        lunch_start_time: timestampToTime(row.lunch_start_time),
        lunch_end_time: timestampToTime(row.lunch_end_time),
    };
};

export const addShift = async (req, res) => {
    try {
        console.log("Dữ liệu nhận được: ", req.body)
        const { shift_name, start_time, end_time, late_tolerance_mins, coefficient, has_lunch_break, lunch_start_time, lunch_end_time, check_in_before_mins, check_out_after_mins } = req.body;

        if (!shift_name || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ tên ca, giờ vào, giờ ra' });
        }

        const id_ca_lam = generateId('CA');

        const query = `
            INSERT INTO CA_LAM_VIEC (id_ca_lam_viec, ten_ca, gio_vao, gio_ra, phut_cho_phep_tre, so_cong, nghi_trua, bat_dau_nghi, ket_thuc_nghi, mo_vao_truoc, dong_ra_sau) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING 
                id_ca_lam_viec AS id, 
                ten_ca AS shift_name, 
                gio_vao AS start_time, 
                gio_ra AS end_time,
                phut_cho_phep_tre AS late_tolerance_mins,
                so_cong AS coefficient,
                nghi_trua AS has_lunch_break,
                bat_dau_nghi AS lunch_start_time,
                ket_thuc_nghi AS lunch_end_time,
                mo_vao_truoc AS check_in_before_mins,
                dong_ra_sau AS check_out_after_mins
        `;
        const values = [
            id_ca_lam,
            shift_name, 
            timeToTimestamp(start_time), 
            timeToTimestamp(end_time), 
            late_tolerance_mins || 0,
            coefficient || 1.0,
            has_lunch_break !== undefined ? has_lunch_break : true,
            timeToTimestamp(lunch_start_time),
            timeToTimestamp(lunch_end_time),
            check_in_before_mins || 60,
            check_out_after_mins || 120
        ];

        const result = await pool.query(query, values);
        console.log("Kết quả là: ", result.rows)
        res.status(201).json({ success: true, message: "Thêm ca làm thành công", data: formatShiftTimes(result.rows[0]) });
    } catch (error) {
        console.error('Error adding shift:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm ca làm' });
    }
}

export const getAllShifts = async (req, res) => {
    try {
        const query = `
            SELECT 
                id_ca_lam_viec AS id, 
                ten_ca AS shift_name, 
                gio_vao AS start_time, 
                gio_ra AS end_time,
                phut_cho_phep_tre AS late_tolerance_mins,
                so_cong AS coefficient,
                nghi_trua AS has_lunch_break,
                bat_dau_nghi AS lunch_start_time,
                ket_thuc_nghi AS lunch_end_time,
                mo_vao_truoc AS check_in_before_mins,
                dong_ra_sau AS check_out_after_mins
            FROM CA_LAM_VIEC
            ORDER BY id_ca_lam_viec ASC
        `;
        const result = await pool.query(query);
        const formatted = result.rows.map(formatShiftTimes);
        console.log("Kết quả là: ", formatted)
        res.status(200).json({ success: true, message: "Lấy danh sách ca làm thành công", data: formatted });
    } catch (error) {
        console.error('Error getting all shifts:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách ca làm' });
    }
}

export const getMyShift = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });

        const query = `
            SELECT ca.*
            FROM NHAN_VIEN nv
            JOIN PHONG_BAN pb ON nv.id_phong_ban = pb.id_phong_ban
            JOIN CA_LAM_VIEC ca ON pb.id_ca_lam_viec = ca.id_ca_lam_viec
            WHERE nv.id_nhan_vien = $1
        `;
        const result = await pool.query(query, [id]);

        let shift = null;
        if (result.rowCount > 0) {
            shift = result.rows[0];
        } else {
            const defaultQuery = 'SELECT * FROM CA_LAM_VIEC ORDER BY id_ca_lam_viec ASC LIMIT 1';
            const defaultResult = await pool.query(defaultQuery);
            if (defaultResult.rowCount > 0) {
                shift = defaultResult.rows[0];
            }
        }

        if (!shift) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc' });
        }

        const formatted = formatShiftTimes({
            id: shift.id_ca_lam_viec,
            shift_name: shift.ten_ca,
            start_time: shift.gio_vao,
            end_time: shift.gio_ra,
            late_tolerance_mins: shift.phut_cho_phep_tre,
            coefficient: shift.so_cong,
            has_lunch_break: shift.nghi_trua,
            lunch_start_time: shift.bat_dau_nghi,
            lunch_end_time: shift.ket_thuc_nghi,
            check_in_before_mins: shift.mo_vao_truoc,
            check_out_after_mins: shift.dong_ra_sau
        });
        
        res.status(200).json({ success: true, message: "Lấy ca làm việc thành công", data: formatted });
    } catch (error) {
        console.error('Error getting my shift:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy ca làm việc' });
    }
}

export const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { shift_name, start_time, end_time, late_tolerance_mins, coefficient, has_lunch_break, lunch_start_time, lunch_end_time, check_in_before_mins, check_out_after_mins } = req.body;

        console.log(`Đang cập nhật ca làm ID: ${id}`, req.body);

        if (!id) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const query = `
            UPDATE CA_LAM_VIEC 
            SET ten_ca = $1, gio_vao = $2, gio_ra = $3, phut_cho_phep_tre = $4,
                so_cong = $5, nghi_trua = $6, bat_dau_nghi = $7, ket_thuc_nghi = $8,
                mo_vao_truoc = $9, dong_ra_sau = $10
            WHERE id_ca_lam_viec = $11 
            RETURNING 
                id_ca_lam_viec AS id, 
                ten_ca AS shift_name, 
                gio_vao AS start_time, 
                gio_ra AS end_time,
                phut_cho_phep_tre AS late_tolerance_mins,
                so_cong AS coefficient,
                nghi_trua AS has_lunch_break,
                bat_dau_nghi AS lunch_start_time,
                ket_thuc_nghi AS lunch_end_time,
                mo_vao_truoc AS check_in_before_mins,
                dong_ra_sau AS check_out_after_mins
        `;
        const values = [
            shift_name, 
            timeToTimestamp(start_time), 
            timeToTimestamp(end_time), 
            late_tolerance_mins || 0,
            coefficient || 1.0,
            has_lunch_break !== undefined ? has_lunch_break : true,
            timeToTimestamp(lunch_start_time),
            timeToTimestamp(lunch_end_time),
            check_in_before_mins || 60,
            check_out_after_mins || 120,
            id
        ];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy ca làm việc này!" });
        }

        console.log("Cập nhật thành công: ", result.rows[0]);
        res.status(200).json({ success: true, message: "Cập nhật thành công", data: formatShiftTimes(result.rows[0]) });

    } catch (error) {
        console.error('Lỗi khi cập nhật ca làm:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật ca làm' });
    }
};

export const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Đang xóa ca làm ID: ${id}`);

        if (!id) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const query = 'DELETE FROM CA_LAM_VIEC WHERE id_ca_lam_viec = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy ca làm việc này!" });
        }

        console.log("Đã xóa ca làm: ", result.rows[0]);
        res.status(200).json({ success: true, message: "Xóa ca làm thành công", data: { id: id } });

    } catch (error) {
        console.error('Lỗi khi xóa ca làm:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa ca làm. Có thể ca này đang được gắn cho nhân viên!' });
    }
};