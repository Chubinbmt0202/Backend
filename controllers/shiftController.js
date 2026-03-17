import pool from '../config/db.js';

export const addShift = async (req, res) => {
    try {
        console.log("Dữ liệu nhận được: ", req.body)
        const { shift_name, start_time, end_time } = req.body;

        const query = 'INSERT INTO shifts (shift_name, start_time, end_time) VALUES ($1, $2, $3) RETURNING *';
        const values = [shift_name, start_time, end_time];

        const result = await pool.query(query, values);
        console.log("Kết quả là: ", result.rows)
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding shift:', error);
        res.status(500).json({ error: 'Failed to add shift' });
    }
}

export const getAllShifts = async (req, res) => {
    try {
        const query = 'SELECT * FROM shifts';
        const result = await pool.query(query);
        console.log("Kết quả là: ", result.rows)
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error getting all shifts:', error);
        res.status(500).json({ error: 'Failed to get all shifts' });
    }
}

export const updateShift = async (req, res) => {
    try {
        // Lấy ID từ URL (VD: /api/shift/1)
        const { id } = req.params;
        const { shift_name, start_time, end_time, late_tolerance_mins } = req.body;

        console.log(`Đang cập nhật ca làm ID: ${id}`, req.body);

        // Mình thêm cột late_tolerance_mins vào luôn để hệ thống của bạn xịn hơn nhé
        const query = `
            UPDATE shifts 
            SET shift_name = $1, start_time = $2, end_time = $3, late_tolerance_mins = $4
            WHERE id = $5 
            RETURNING *;
        `;
        const values = [shift_name, start_time, end_time, late_tolerance_mins || 0, id];

        const result = await pool.query(query, values);

        // Kiểm tra xem ID đó có tồn tại trong DB không
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy ca làm việc này!" });
        }

        console.log("Cập nhật thành công: ", result.rows[0]);
        res.status(200).json({ success: true, message: "Cập nhật thành công", data: result.rows[0] });

    } catch (error) {
        console.error('Lỗi khi cập nhật ca làm:', error);
        res.status(500).json({ success: false, error: 'Lỗi server khi cập nhật ca làm' });
    }
};
export const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Đang xóa ca làm ID: ${id}`);

        const query = 'DELETE FROM shifts WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy ca làm việc này!" });
        }

        console.log("Đã xóa ca làm: ", result.rows[0]);
        res.status(200).json({ success: true, message: "Xóa ca làm thành công", data: result.rows[0] });

    } catch (error) {
        console.error('Lỗi khi xóa ca làm:', error);
        res.status(500).json({ success: false, error: 'Lỗi server khi xóa ca làm. Có thể ca này đang được gắn cho nhân viên!' });
    }
};