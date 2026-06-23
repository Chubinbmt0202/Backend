import pool from '../config/db.js';
import { taoId } from '../utils/tienIchTaoId.js';

// Thêm vai trò mới
export const themVaiTro = async (req, res) => {
    try {
        const { ten_vai_tro, mo_ta } = req.body;
        if (!ten_vai_tro) {
            return res.status(400).json({ success: false, message: 'Tên vai trò là bắt buộc.' });
        }

        const id_vai_tro = taoId('VT');

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
export const ganVaiTro = async (req, res) => {
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

export const layDanhSachVaiTro = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM VAI_TRO ORDER BY id_vai_tro ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách vai trò:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

export const capNhatVaiTro = async (req, res) => {
    try {
        const { id } = req.params;
        const { ten_vai_tro, mo_ta } = req.body;
        
        if (!ten_vai_tro) {
            return res.status(400).json({ success: false, message: 'Tên vai trò là bắt buộc.' });
        }

        const result = await pool.query(
            'UPDATE VAI_TRO SET ten_vai_tro = $1, mo_ta = $2 WHERE id_vai_tro = $3 RETURNING *',
            [ten_vai_tro, mo_ta, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò.' });
        }

        res.status(200).json({ success: true, data: result.rows[0], message: 'Cập nhật thành công.' });
    } catch (error) {
        console.error('Lỗi khi cập nhật vai trò:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

export const xoaVaiTro = async (req, res) => {
    try {
        const { id } = req.params;

        // Các vai trò hệ thống mặc định không cho phép xoá
        const systemRoles = ['VT001', 'VT002', 'VT003']; 
        if (systemRoles.includes(id)) {
            return res.status(400).json({ success: false, message: 'Không thể xóa các vai trò hệ thống mặc định.' });
        }

        // Kiểm tra xem vai trò có tài khoản nào đang sử dụng không
        const checkQuery = await pool.query('SELECT COUNT(*) FROM TAI_KHOAN WHERE id_vai_tro = $1', [id]);
        const count = parseInt(checkQuery.rows[0].count);

        if (count > 0) {
            return res.status(400).json({ success: false, message: 'Không thể xóa vai trò đang có tài khoản sử dụng.' });
        }

        const result = await pool.query('DELETE FROM VAI_TRO WHERE id_vai_tro = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò.' });
        }

        res.status(200).json({ success: true, message: 'Xóa vai trò thành công.' });
    } catch (error) {
        console.error('Lỗi khi xóa vai trò:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};
