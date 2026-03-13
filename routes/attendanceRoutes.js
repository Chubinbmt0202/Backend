import express from 'express';
import { getAttendanceStatus, getAllAttendance, getEmployeeAttendanceHistory } from '../controllers/attendanceController.js';

const router = express.Router();

// GET /api/attendance/list/daily?date=YYYY-MM-DD - Lấy danh sách chấm công của tất cả NV
router.get('/list/daily', getAllAttendance);

// GET /api/attendance/history/:userId - Lấy lịch sử chấm công của 1 NV
router.get('/history/:userId', getEmployeeAttendanceHistory);

// GET /api/attendance/:userId?date=YYYY-MM-DD - Lấy trạng thái chấm công của 1 NV
router.get('/:userId', getAttendanceStatus);

export default router;
