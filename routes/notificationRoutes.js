import express from 'express';
import { 
    taoThongBao,
    layThongBaoNhanVien,
    danhDauDaDoc,
    danhDauTatCaDaDoc,
    xoaThongBao
} from '../controllers/notificationController.js';

const router = express.Router();

// Tạo thông báo mới (Admin hoặc test)
router.post('/create', taoThongBao);

// Lấy danh sách thông báo của 1 nhân viên
router.get('/employee/:employeeId', layThongBaoNhanVien);

// Đánh dấu 1 thông báo là đã đọc
router.put('/mark-read/:id', danhDauDaDoc);

// Đánh dấu tất cả thông báo của 1 nhân viên là đã đọc
router.put('/mark-all-read', danhDauTatCaDaDoc);

// Xóa 1 thông báo
router.delete('/delete/:id', xoaThongBao);

export default router;
