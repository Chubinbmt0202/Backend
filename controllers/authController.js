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
          tk.id_tai_khoan,
          tk.ten_dang_nhap,
          tk.mat_khau,
          tk.id_vai_tro,
          vt.ten_vai_tro,
          tk.trang_thai,
          nv.id_nhan_vien,
          nv.ho_va_ten
        FROM TAI_KHOAN tk
        LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
        LEFT JOIN NHAN_VIEN nv ON nv.id_tai_khoan = tk.id_tai_khoan
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

    const user = userResult.rows[0];

    if (!user.trang_thai) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị khóa.",
      });
    }

    // Lưu session
    req.session.userId = user.id_tai_khoan;
    req.session.roleId = user.id_vai_tro;
    req.session.roleName = user.ten_vai_tro;

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        id_tai_khoan: user.id_tai_khoan,
        ten_dang_nhap: user.ten_dang_nhap,
        id_vai_tro: user.id_vai_tro,
        ten_vai_tro: user.ten_vai_tro,
        id_nhan_vien: user.id_nhan_vien,
        ho_va_ten: user.ho_va_ten
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
