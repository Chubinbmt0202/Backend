import express from 'express';
import { getAttendanceStatus } from '../controllers/attendanceController.js';

const router = express.Router();

// GET /api/attendance/:userId?date=YYYY-MM-DD
router.get('/:userId', getAttendanceStatus);

export default router;
