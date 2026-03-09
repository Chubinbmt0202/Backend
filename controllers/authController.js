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
    // (Do lúc trước mật khẩu lưu dưới dạng text thường)
    // bcrypt.compare sẽ trả về false nếu chuỗi hash không hợp lệ (nghĩa là nó là text thường)
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
