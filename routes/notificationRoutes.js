import express from 'express';
import { 
    createNotification,
    getEmployeeNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Tạo thông báo mới (Admin hoặc test)
router.post('/create', createNotification);

// Lấy danh sách thông báo của 1 nhân viên
router.get('/employee/:employeeId', getEmployeeNotifications);

// Đánh dấu 1 thông báo là đã đọc
router.put('/mark-read/:id', markAsRead);

// Đánh dấu tất cả thông báo của 1 nhân viên là đã đọc
router.put('/mark-all-read', markAllAsRead);

// Xóa 1 thông báo
router.delete('/delete/:id', deleteNotification);

export default router;
