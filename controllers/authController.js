import pool from "../config/db.js";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  try {
    const { username, password, wifi_bssid } = req.body;
    console.log(`\n[LOGIN ATTEMPT] User: ${username} | BSSID: ${wifi_bssid || "N/A"}`);
    console.log("Full Login Body:", req.body);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp username và password.",
      });
    }

    // 1. Kiểm tra WiFi công ty (Chỉ bắt buộc trên Mobile)
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /mobile|android|iphone|ipad|expo|okhttp/i.test(userAgent);

    if (isMobile) {
      console.log("[CHECK] Mobile request detected, enforcing WiFi validation...");
      // Lấy tất cả BSSID hợp lệ từ bảng WIFI
      const wifiResult = await pool.query("SELECT dia_chi_wifi FROM WIFI");
      const validBssids = wifiResult.rows.map(row => row.dia_chi_wifi?.toLowerCase());

      if (!wifi_bssid || !validBssids.includes(wifi_bssid.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: "Bạn phải sử dụng WiFi công ty để đăng nhập trên ứng dụng mobile.",
        });
      }
    } else {
      console.log("[CHECK] Web/Admin request detected, skipping WiFi validation.");
    }


    // 2. Tìm người dùng
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
          nv.ho_va_ten,
          (nv.du_lieu_khuon_mat IS NOT NULL) as is_face_updated
        FROM TAI_KHOAN tk
        LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
        LEFT JOIN NHAN_VIEN nv ON nv.id_tai_khoan = tk.id_tai_khoan
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

    // 3. Kiểm tra mật khẩu
    // Lưu ý: Trong database.sql có dữ liệu mẫu là plain text '123456'
    // Nhưng employeeController sử dụng bcrypt để hash. 
    // Ta sẽ kiểm tra cả 2 trường hợp để tương thích với dữ liệu mẫu.
    let isPasswordMatch = false;
    if (user.mat_khau === password) {
      isPasswordMatch = true;
    } else {
      isPasswordMatch = await bcrypt.compare(password, user.mat_khau);
    }

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Username hoặc password không chính xác.",
      });
    }

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
      token: user.id_tai_khoan.toString(), // Sử dụng ID làm token tạm thời cho mobile
      is_face_updated: user.is_face_updated,
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
