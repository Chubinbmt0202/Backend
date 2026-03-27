import pool from '../config/db.js';

// Thêm phòng ban mới
export const addDepartment = async (req, res) => {
    try {
        const { mo_ta, id_nguoi_dung, ten_phong_ban } = req.body;
        // mo_ta is optional in SQL but likely needed
        console.log("Dữ liệu nhận được khi thêm phòng ban:", req.body);

        const result = await pool.query(
            'INSERT INTO PHONG_BAN (mo_ta, ten_phong_ban) VALUES ($1, $2) RETURNING *',
            [mo_ta || null, ten_phong_ban || null]
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
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phòng ban:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};
