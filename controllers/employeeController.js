import pool from '../config/db.js';
import bcrypt from 'bcrypt';

// Controller API Thêm nhân viên mới (Vào bảng users)
export const addEmployee = async (req, res) => {
    console.log("Dữ liệu nhận được:",req.body);
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

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Câu lệnh SQL thêm nhân viên vào bảng users
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash, role, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, full_name, created_at",
            [username, hashedPassword, userRole, full_name]
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
            "SELECT id, username, full_name, role, is_face_updated, created_at FROM users ORDER BY created_at DESC"
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
