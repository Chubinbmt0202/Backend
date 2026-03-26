import pool from "../config/db.js";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Data login: ", req.body);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp username và password.",
      });
    }

    const userResult = await pool.query(
      `
        SELECT
          tk.id,
          tk.ten_dang_nhap,
          tk.mat_khau_hash,
          tk.vai_tro,
          tk.trang_thai,
          nv.id AS nhan_vien_id,
          nv.ho_ten,
          nv.khuon_mat_da_cap_nhat
        FROM tai_khoan tk
        LEFT JOIN nhan_vien nv ON nv.tai_khoan_id = tk.id
        WHERE tk.ten_dang_nhap = $1
        LIMIT 1
      `,
      [username],
    );

    console.log("User result: ", userResult.rows)

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc password không chính xác.",
      });
    }

    if (userResult.rows.length != 0) {
      res.status(200).json({
        success: true,
        message: "Đăng nhập thành công",
        data: userResult.rows[0],
      });
    }

  } catch (error) {
    console.error("Lỗi khi đăng nhập:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại sau.",
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Hủy session server-side
    req.session.destroy((err) => {
      if (err) {
        console.error("Lỗi khi đăng xuất:", err.message);
        return res.status(500).json({
          success: false,
          message: "Lỗi server, vui lòng thử lại sau.",
        });
      }

      // Xóa cookie trên client (tên mặc định của express-session là connect.sid)
      res.clearCookie("connect.sid");

      return res.status(200).json({
        success: true,
        message: "Đăng xuất thành công",
      });
    });
  } catch (error) {
    console.error("Lỗi khi đăng xuất:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi server, vui lòng thử lại sau.",
    });
  }
};
