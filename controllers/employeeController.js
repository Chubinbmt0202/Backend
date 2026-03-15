import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { findBestMatch } from '../utils/faceUtils.js';

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
        // 1. Lấy dữ liệu từ Mobile gửi lên
        // Lưu ý: Client (React Native) phải gửi body dạng { userId: ..., embeddings: [...] }
        const { userId, embedding } = req.body;

        console.log(`Nhận yêu cầu cập nhật khuôn mặt cho User ID: ${userId}`);

        // 2. Kiểm tra tính hợp lệ cơ bản
        if (!userId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin userId" });
        }

        if (!embedding || !Array.isArray(embedding) || embedding.length !== 3) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu khuôn mặt không hợp lệ (Bắt buộc phải có đúng 3 góc ảnh)"
            });
        }

        // 3. Kiểm tra chi tiết: Đảm bảo cả 3 mảng con đều là mảng 128 số của MobileFaceNet
        for (let i = 0; i < embedding.length; i++) {
            if (!Array.isArray(embedding[i]) || embedding[i].length !== 192) {
                return res.status(400).json({
                    success: false,
                    message: `Vector ở vị trí thứ ${i + 1} bị lỗi. Yêu cầu mảng 192 số, nhưng nhận được ${embedding[i]?.length || 0} số.`
                });
            }
        }

        // 4. Lưu vào Database (PostgreSQL)
        // PostgreSQL cột JSONB yêu cầu truyền vào một chuỗi JSON
        const embeddingJSON = JSON.stringify(embedding);

        const updateQuery = `
            UPDATE users 
            SET face_mesh_data = $1,
                is_face_updated = true
            WHERE id = $2 
            RETURNING id, username, full_name, is_face_updated;
        `;

        // Chạy query (Sử dụng pool từ db.js của bạn)
        const result = await pool.query(updateQuery, [embeddingJSON, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng trong hệ thống" });
        }

        // 5. Trả về kết quả thành công cho Mobile
        return res.status(200).json({
            success: true,
            message: "Đã đăng ký 3 góc khuôn mặt thành công!",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Lỗi khi lưu khuôn mặt:", error);
        return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
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

/**
 * Controller API Nhận diện khuôn mặt (Identify)
 * Tìm xem khuôn mặt này là của nhân viên nào trong hệ thống
 */
export const recognizeEmployeeFace = async (req, res) => {
    try {
        const { userId, embedding } = req.body;
        console.log(`Đang xác thực khuôn mặt cho User ID: ${userId}`);

        // SỬA LỖI: Yêu cầu mảng 128 số (MobileFaceNet)
        if (!embedding || !Array.isArray(embedding) || embedding.length !== 192) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu khuôn mặt không hợp lệ (Yêu cầu mảng 192 số)."
            });
        }

        // 1. Lấy thông tin nhân viên theo userId
        const query = `SELECT id, username, full_name, role, face_mesh_data FROM users WHERE id = $1 AND is_face_updated = true`;
        const result = await pool.query(query, [userId]);

        // Nếu không tìm thấy dòng nào
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên hoặc nhân viên này chưa đăng ký khuôn mặt."
            });
        }

        // 2. Lấy dữ liệu của user duy nhất vừa query ra
        const user = result.rows[0];

        // Đảm bảo parse mảng JSON nếu Database trả về kiểu chuỗi String
        const storedEmbeddings = typeof user.face_mesh_data === 'string'
            ? JSON.parse(user.face_mesh_data)
            : user.face_mesh_data;

        // 3. Tiến hành so sánh ảnh camera gửi lên với 3 góc mặt đã lưu
        const match = findBestMatch(embedding, storedEmbeddings);
        const minSimilarity = 80; // Ngưỡng nhận diện (80%)

        // 4. Kiểm tra kết quả và trả về
        if (match.bestSimilarity >= minSimilarity) {
            return res.status(200).json({
                success: true,
                message: `Xác thực thành công. Độ tương đồng: ${match.bestSimilarity.toFixed(2)}%`,
                data: {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role,
                    similarity: match.bestSimilarity.toFixed(2) + '%',
                    distance: match.bestDistance.toFixed(4)
                }
            });
        } else {
            return res.status(401).json({ // Dùng mã 401 Unauthorized khi sai khuôn mặt
                success: false,
                message: "Khuôn mặt không khớp. Vui lòng thử lại!",
                bestSimilarity: match.bestSimilarity.toFixed(2) + '%'
            });
        }

    } catch (error) {
        console.error("Lỗi khi xác thực khuôn mặt:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ"
        });
    }
};



