import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

// Thêm phòng ban mới
export const addDepartment = async (req, res) => {
    try {
        const { mo_ta, id_nguoi_dung } = req.body;
        const id_phong_ban = generateId('PB');
        
        console.log("Dữ liệu nhận được khi thêm phòng ban:", req.body);

        const result = await pool.query(
            'INSERT INTO PHONG_BAN (id_phong_ban, mo_ta, ngay_tao, id_nguoi_dung) VALUES ($1, $2, CURRENT_TIMESTAMP, $3) RETURNING *',
            [id_phong_ban, mo_ta || null, id_nguoi_dung || null]
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
