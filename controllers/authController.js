import pool from "../config/db.js";
import bcrypt from "bcrypt";

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

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc password không chính xác.",
      });
    }

    const user = userResult.rows[0];

    if (user.trang_thai && user.trang_thai !== "hoat_dong") {
      return res.status(403).json({
        success: false,
        message: `Tài khoản đang ở trạng thái: ${user.trang_thai}.`,
      });
    }

    // Kiểm tra mật khẩu (hỗ trợ cả bcrypt và mật khẩu thuần nếu có)
    let isMatch = false;
    if (
      typeof user.mat_khau_hash === "string" &&
      (user.mat_khau_hash.startsWith("$2") ||
        user.mat_khau_hash.startsWith("$2a") ||
        user.mat_khau_hash.startsWith("$2b"))
    ) {
      isMatch = await bcrypt.compare(password, user.mat_khau_hash);
    } else {
      isMatch = password === user.mat_khau_hash;
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
      SELECT
        (date(cc.thoi_gian))::date AS log_date,
        MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') AS check_in_time,
        MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') AS check_out_time,
        CASE
          WHEN MIN(cc.thoi_gian) FILTER (WHERE cc.loai = 'vao') IS NULL THEN 'none'
          WHEN MAX(cc.thoi_gian) FILTER (WHERE cc.loai = 'ra') IS NULL THEN 'checked_in'
          ELSE 'checked_out'
        END AS status
      FROM cham_cong cc
      WHERE cc.nhan_vien_id = $1
      GROUP BY (date(cc.thoi_gian))::date
      ORDER BY log_date DESC
      LIMIT 30;
    `;
    const attendanceResult = await pool.query(attendanceQuery, [
      user.nhan_vien_id,
    ]);
    const attendanceLogs = attendanceResult.rows;

    // Tạo session cookie (không dùng JWT)
    req.session.regenerate((regenErr) => {
      if (regenErr) {
        console.error("Lỗi khi tạo session:", regenErr.message);
        return res.status(500).json({
          success: false,
          message: "Lỗi server, vui lòng thử lại sau.",
        });
      }

      req.session.user = {
        id: user.id, // tai_khoan.id
        username: user.ten_dang_nhap,
        full_name: user.ho_ten,
        role: user.vai_tro,
        nhan_vien_id: user.nhan_vien_id,
        is_face_updated: user.khuon_mat_da_cap_nhat,
      };

      res.status(200).json({
        success: true,
        message: "Đăng nhập thành công",
        is_face_updated: user.khuon_mat_da_cap_nhat,
        data: {
          id: user.id,
          username: user.ten_dang_nhap,
          full_name: user.ho_ten,
          role: user.vai_tro,
          nhan_vien_id: user.nhan_vien_id,
          is_face_updated: user.khuon_mat_da_cap_nhat,
          // ĐÍNH KÈM LỊCH SỬ CHẤM CÔNG VÀO OBJECT TRẢ VỀ
          attendance_history: attendanceLogs,
        },
      });
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
