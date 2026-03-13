import pool from '../config/db.js';
import bcrypt from 'bcrypt';

// Controller API Thêm nhân viên mới (Vào bảng users)
export const addEmployee = async (req, res) => {
    console.log("Dữ liệu nhận được:", req.body);
    try {
        const { username, password, full_name, role } = req.body;

        // Kiểm tra dữ liệu đầu vào cơ bản
        if (!username || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ username, password và full_name.'
            });
        }

        // Chức vụ mặc định là 'employee' nếu không truyền
        const userRole = role === 'admin' ? 'admin' : 'employee';

        // Câu lệnh SQL thêm nhân viên vào bảng users
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash, role, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, full_name, created_at",
            [username, password, userRole, full_name]
        );

        res.status(201).json({
            success: true,
            message: 'Thêm nhân viên mới thành công!',
            data: newUser.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi thêm nhân viên:', error.message);

        // Bắt lỗi trùng lặp username
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Username đã tồn tại trong hệ thống.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Controller API Lấy danh sách nhân viên
export const getEmployees = async (req, res) => {
    try {
        // Chỉ lấy những thông tin cần thiết, không lấy password_hash
        const employees = await pool.query(
            "SELECT id, username, full_name, role, is_face_updated, created_at, email, date_of_birth, phone_number, gender, address FROM users ORDER BY created_at DESC"
        );

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách nhân viên thành công',
            data: employees.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Lấy 1 nhân viên
export const getEmployeeByID = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("ID nhân viên: ", id)

        // Kiểm tra id có hợp lệ không
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        // Câu lệnh SQL lấy thông tin nhân viên (không lấy password_hash và dữ liệu khuôn mặt thô)
        const query = `
            SELECT id, username, full_name, role, is_face_updated, created_at, 
                   email, date_of_birth, phone_number, gender, address 
            FROM users 
            WHERE id = $1
        `;

        const employee = await pool.query(query, [id]);

        // Kiểm tra xem có tìm thấy nhân viên không
        if (employee.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên với ID này.'
            });
        }

        // Trả về dữ liệu thành công
        res.status(200).json({
            success: true,
            message: 'Lấy thông tin nhân viên thành công',
            data: employee.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi lấy thông tin 1 nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Chỉnh sửa thông tin nhân viên
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, role, password } = req.body;

        // Kiểm tra id có hợp lệ không
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        // Kiểm tra có dữ liệu nào để cập nhật không
        if (!full_name && !role && !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ít nhất một trường để cập nhật (full_name, role, password).'
            });
        }

        // Xây dựng câu query động dựa trên các trường được gửi lên
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (full_name) {
            fields.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }

        if (role) {
            const userRole = role === 'admin' ? 'admin' : 'employee';
            fields.push(`role = $${paramIndex++}`);
            values.push(userRole);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            fields.push(`password_hash = $${paramIndex++}`);
            values.push(hashedPassword);
        }

        // Thêm id vào cuối mảng values
        values.push(id);

        const updateQuery = `
            UPDATE users 
            SET ${fields.join(', ')} 
            WHERE id = $${paramIndex} 
            RETURNING id, username, full_name, role, is_face_updated, created_at, email, date_of_birth, phone_number, gender, address
        `;

        const result = await pool.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên với ID này.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin nhân viên thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Xoá 1 nhân viên
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra id có hợp lệ không
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        // Xoá nhân viên khỏi bảng users
        const result = await pool.query(
            "DELETE FROM users WHERE id = $1 RETURNING id, username, full_name, role",
            [id]
        );

        // Kiểm tra có tìm thấy nhân viên để xoá không
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên với ID này.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xoá nhân viên thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi xoá nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
}

// Controller API Upload ảnh khuôn mặt
export const uploadEmployeeFace = async (req, res) => {
    try {
        // 1. Lấy dữ liệu từ Mobile gửi lên (từ req.body)
        const { userId, embedding } = req.body;
        console.log("Dữ liệu nhận được:", req.body);

        // 2. Kiểm tra tính hợp lệ
        if (!userId) {
            return res.status(400).json({ message: "Thiếu thông tin userId" });
        }

        // Đảm bảo embedding là một mảng và có đúng 192 con số
        if (!embedding || !Array.isArray(embedding) || embedding.length !== 192) {
            return res.status(400).json({ message: "Dữ liệu khuôn mặt không hợp lệ (Phải là mảng 192 số)" });
        }

        // 3. Lưu vào Database (PostgreSQL)
        // Chuyển mảng thành chuỗi JSON để lưu vào cột JSONB
        const embeddingJSON = JSON.stringify(embedding);

        // SỬA LẠI: Tên cột phải là 'face_mesh_data' theo đúng bảng users
        const updateQuery = `
      UPDATE users 
      SET face_mesh_data = $1,
          is_face_updated = true
      WHERE id = $2 
      RETURNING *;
    `;

        // Giả định bạn đang dùng thư viện 'pg' (Pool)
        const result = await pool.query(updateQuery, [embeddingJSON, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        // 4. Trả về kết quả cho Mobile
        return res.status(200).json({
            success: true,
            message: "Đã lưu dữ liệu khuôn mặt thành công!",
            // Trả về thông tin user vừa update (có thể bỏ dòng dưới nếu không cần thiết)
            user: {
                id: result.rows[0].id,
                is_face_updated: result.rows[0].is_face_updated
            }
        });

    } catch (error) {
        console.error("Lỗi khi lưu khuôn mặt:", error);
        return res.status(500).json({ message: "Lỗi server nội bộ" });
    }
};

// Controller API Yêu cầu cập nhật lại khuôn mặt
export const requestFaceUpdate = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        const updateQuery = `
            UPDATE users 
            SET face_mesh_data = NULL,
                is_face_updated = false
            WHERE id = $1 
            RETURNING id, username, full_name, is_face_updated;
        `;

        const result = await pool.query(updateQuery, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Yêu cầu cập nhật khuôn mặt đã được ghi nhận. Dữ liệu cũ đã bị xoá.",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Lỗi khi yêu cầu cập nhật khuôn mặt:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ"
        });
    }
};



