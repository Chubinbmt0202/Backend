import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

// Thêm phòng ban mới
export const addDepartment = async (req, res) => {
    try {
        const { ten_phong_ban, mo_ta, mo_ta_chuc_nang, id_nguoi_dung } = req.body;
        const id_phong_ban = generateId('PB');
        
        console.log("Dữ liệu nhận được khi thêm phòng ban:", req.body);

        const final_mo_ta = mo_ta_chuc_nang || mo_ta || ten_phong_ban;

        const result = await pool.query(
            'INSERT INTO PHONG_BAN (id_phong_ban, ten_phong_ban, mo_ta, ngay_tao, id_nguoi_dung) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4) RETURNING *',
            [id_phong_ban, ten_phong_ban || null, final_mo_ta || null, id_nguoi_dung || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Lỗi khi thêm phòng ban:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

export const getDepartments = async (req, res) => {
    try {
        const query = `
            SELECT * from PHONG_BAN
        `;
        const result = await pool.query(query);
        console.log("Kết quả dữ liệu phòng ban là: ", result.rows);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng ban:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

// Cập nhật phòng ban
export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_phong_ban, mo_ta } = req.body;
        
        const result = await pool.query(
            'UPDATE PHONG_BAN SET ten_phong_ban = $1, mo_ta = $2 WHERE id_phong_ban = $3 RETURNING *',
            [ten_phong_ban || null, mo_ta || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban.' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Lỗi khi cập nhật phòng ban:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

// Xóa phòng ban
export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem phòng ban có nhân viên nào không
        const checkQuery = await pool.query('SELECT COUNT(*) FROM NHAN_VIEN WHERE id_phong_ban = $1', [id]);
        const employeeCount = parseInt(checkQuery.rows[0].count);

        if (employeeCount > 0) {
            return res.status(400).json({ success: false, message: 'Không thể xóa phòng ban đang có nhân viên.' });
        }

        const result = await pool.query('DELETE FROM PHONG_BAN WHERE id_phong_ban = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phòng ban.' });
        }

        res.status(200).json({ success: true, message: 'Xóa phòng ban thành công.' });
    } catch (error) {
        console.error('Lỗi khi xóa phòng ban:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};
