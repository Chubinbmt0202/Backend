import express from 'express';
import { 
    themNhanVien, 
    layDanhSachNhanVien, 
    layNhanVienTheoID, 
    capNhatNhanVien, 
    xoaNhanVien, 
    taiLenKhuonMatNhanVien,
    yeuCauCapNhatKhuonMat,
    yeuCauCapNhatHoSo,
    nhanDienKhuonMatNhanVien,
    layNhanVienTheoPhongBan,
    layThongKeNhanVien,
    capNhatFcmToken,
    doiMatKhau
} from '../controllers/nhanVienController.js';

const router = express.Router();

// Định nghĩa route POST /api/employees để thêm nhân viên
router.post('/add', themNhanVien);

// Định nghĩa route PUT /api/employees/update/:id để chỉnh sửa nhân viên
router.put('/update/:id', capNhatNhanVien);

// Định nghĩa route PUT /api/employees/change-password/:id để đổi mật khẩu
router.put('/change-password/:id', doiMatKhau);

// Định nghĩa route DELETE /api/employees/delete/:id để xoá nhân viên
router.delete('/delete/:id', xoaNhanVien);

// Định nghĩa route GET /api/employees để lấy danh sách nhân viên
router.get('/getAll', layDanhSachNhanVien);

// lấy 1 nhân viên
router.get('/getByID/:id', layNhanVienTheoID);

// Lấy danh sách nhân viên theo phòng ban
router.get('/by-department/:id', layNhanVienTheoPhongBan);

// API Cho Mobile: Upload khuôn mặt
router.post('/upload-face', taiLenKhuonMatNhanVien);

// API Yêu cầu cập nhật khuôn mặt
router.put('/request-face-update/:id', yeuCauCapNhatKhuonMat);

// API Yêu cầu cập nhật thông tin cá nhân
router.put('/request-profile-update/:id', yeuCauCapNhatHoSo);

// API Cập nhật FCM Token cho nhân viên
router.post('/fcm-token', capNhatFcmToken);

// API Cho Mobile: Nhận diện khuôn mặt (Identify)
router.post('/recognize', nhanDienKhuonMatNhanVien);

// API Dashboard nhân viên (Tổng hợp dữ liệu)
router.get('/dashboard/:id', layThongKeNhanVien);

export default router;
