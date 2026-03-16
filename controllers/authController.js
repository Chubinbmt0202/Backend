import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp username và password.",
      });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc password không chính xác.",
      });
    }

    const user = userResult.rows[0];

    // Kiểm tra xem mật khẩu đang lưu là mật khẩu đã hash hay mật khẩu thuần
    let isMatch = false;

    if (
      user.password_hash.startsWith("$2") ||
      user.password_hash.startsWith("$2a") ||
      user.password_hash.startsWith("$2b")
    ) {
      // Đây là chuỗi đã được hash bằng bcrypt
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      // Đây là mật khẩu thuần
      isMatch = password === user.password_hash;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc password không chính xác.",
      });
    }

    // =========================================================
    // 🚀 TRUY VẤN THÊM LỊCH SỬ CHẤM CÔNG CỦA USER NÀY
    // =========================================================  
    const attendanceQuery = `
      SELECT log_date, check_in_time, check_out_time, status 
      FROM attendance_logs 
      WHERE user_id = $1 
      ORDER BY log_date DESC 
      LIMIT 30;
    `;
    const attendanceResult = await pool.query(attendanceQuery, [user.id]);
    const attendanceLogs = attendanceResult.rows;

    // Tạo JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        is_face_updated: user.is_face_updated
      },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "1d" }, // Token sống trong 1 ngày
    );

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token: token,
      is_face_updated: user.is_face_updated,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_face_updated: user.is_face_updated,
        // 🚀 ĐÍNH KÈM LỊCH SỬ CHẤM CÔNG VÀO OBJECT TRẢ VỀ
        attendance_history: attendanceLogs
      },
    });
  } catch (error) {
    console.error("Lỗi khi đăng nhập:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại sau.",
    });
  }
};