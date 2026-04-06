import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

export const addShift = async (req, res) => {
    try {
        console.log("Dữ liệu nhận được: ", req.body)
        const { shift_name, start_time, end_time, late_tolerance_mins, coefficient, has_lunch_break, lunch_start_time, lunch_end_time } = req.body;

        if (!shift_name || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ tên ca, giờ vào, giờ ra' });
        }

        const id_ca_lam = generateId('CA');

        const query = `
            INSERT INTO CA_LAM_VIEC (id_ca_lam, ten_ca, gio_vao, gio_ra, phut_cho_phep_tre, so_cong, nghi_trua, bat_dau_nghi, ket_thuc_nghi, ngay_tao) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP) 
            RETURNING 
                id_ca_lam AS id, 
                ten_ca AS shift_name, 
                gio_vao AS start_time, 
                gio_ra AS end_time,
                phut_cho_phep_tre AS late_tolerance_mins,
                so_cong AS coefficient,
                nghi_trua AS has_lunch_break,
                bat_dau_nghi AS lunch_start_time,
                ket_thuc_nghi AS lunch_end_time,
                ngay_tao AS created_at
        `;
        const values = [
            id_ca_lam,
            shift_name, 
            start_time, 
            end_time, 
            late_tolerance_mins || 0,
            coefficient || 1.0,
            has_lunch_break !== undefined ? has_lunch_break : true,
            lunch_start_time || null,
            lunch_end_time || null
        ];

        const result = await pool.query(query, values);
        console.log("Kết quả là: ", result.rows)
        res.status(201).json({ success: true, message: "Thêm ca làm thành công", data: result.rows[0] });
    } catch (error) {
        console.error('Error adding shift:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm ca làm' });
    }
}

export const getAllShifts = async (req, res) => {
    try {
        const query = `
            SELECT 
                id_ca_lam AS id, 
                ten_ca AS shift_name, 
                gio_vao AS start_time, 
                gio_ra AS end_time,
                phut_cho_phep_tre AS late_tolerance_mins,
                so_cong AS coefficient,
                nghi_trua AS has_lunch_break,
                bat_dau_nghi AS lunch_start_time,
                ket_thuc_nghi AS lunch_end_time,
                ngay_tao AS created_at
            FROM CA_LAM_VIEC
            ORDER BY id_ca_lam ASC
        `;
        const result = await pool.query(query);
        console.log("Kết quả là: ", result.rows)
        res.status(200).json({ success: true, message: "Lấy danh sách ca làm thành công", data: result.rows });
    } catch (error) {
        console.error('Error getting all shifts:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách ca làm' });
    }
}

export const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { shift_name, start_time, end_time, late_tolerance_mins, coefficient, has_lunch_break, lunch_start_time, lunch_end_time } = req.body;

        console.log(`Đang cập nhật ca làm ID: ${id}`, req.body);

        if (!id) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const query = `
            UPDATE CA_LAM_VIEC 
            SET ten_ca = $1, gio_vao = $2, gio_ra = $3, phut_cho_phep_tre = $4,
                so_cong = $5, nghi_trua = $6, bat_dau_nghi = $7, ket_thuc_nghi = $8
            WHERE id_ca_lam = $9 
            RETURNING 
                id_ca_lam AS id, 
                ten_ca AS shift_name, 
                gio_vao AS start_time, 
                gio_ra AS end_time,
                phut_cho_phep_tre AS late_tolerance_mins,
                so_cong AS coefficient,
                nghi_trua AS has_lunch_break,
                bat_dau_nghi AS lunch_start_time,
                ket_thuc_nghi AS lunch_end_time,
                ngay_tao AS created_at
        `;
        const values = [
            shift_name, 
            start_time, 
            end_time, 
            late_tolerance_mins || 0,
            coefficient || 1.0,
            has_lunch_break !== undefined ? has_lunch_break : true,
            lunch_start_time || null,
            lunch_end_time || null,
            id
        ];

        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy ca làm việc này!" });
        }

        console.log("Cập nhật thành công: ", result.rows[0]);
        res.status(200).json({ success: true, message: "Cập nhật thành công", data: result.rows[0] });

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

        const query = 'DELETE FROM CA_LAM_VIEC WHERE id_ca_lam = $1 RETURNING *';
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