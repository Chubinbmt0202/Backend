import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

// Thêm vai trò mới
export const addRole = async (req, res) => {
    try {
        const { ten_vai_tro, mo_ta } = req.body;
        if (!ten_vai_tro) {
            return res.status(400).json({ success: false, message: 'Tên vai trò là bắt buộc.' });
        }

        const id_vai_tro = generateId('VT');

        const result = await pool.query(
            'INSERT INTO VAI_TRO (id_vai_tro, ten_vai_tro, mo_ta) VALUES ($1, $2, $3) RETURNING *',
            [id_vai_tro, ten_vai_tro, mo_ta]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Lỗi khi thêm vai trò:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

// Phân quyền cho tài khoản (gán vai trò)
export const assignRole = async (req, res) => {
    try {
        const { id_tai_khoan, id_vai_tro } = req.body;
        if (!id_tai_khoan || !id_vai_tro) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin tài khoản hoặc vai trò.' });
        }

        const result = await pool.query(
            'UPDATE TAI_KHOAN SET id_vai_tro = $1 WHERE id_tai_khoan = $2 RETURNING *',
            [id_vai_tro, id_tai_khoan]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Lỗi khi phân quyền:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

export const getRoles = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM VAI_TRO ORDER BY id_vai_tro ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách vai trò:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};
