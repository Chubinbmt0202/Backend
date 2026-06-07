import express from 'express';
import multer from 'multer';
import { createLeaveRequest, getEmployeeLeaves, getAllLeaveRequests, updateLeaveStatus, getAllLeaveTypes, updateLeaveType } from '../controllers/leaveController.js';


const router = express.Router();

// Cấu hình multer để xử lý file đính kèm (minh chứng)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

// POST /api/leave/create
router.post('/create', upload.single('file'), createLeaveRequest);

// GET /api/leave/all
router.get('/all', getAllLeaveRequests);

// GET /api/leave/history/:employeeId
router.get('/history/:employeeId', getEmployeeLeaves);

// PATCH /api/leave/update-status
router.patch('/update-status', updateLeaveStatus);

// GET /api/leave/types
router.get('/types', getAllLeaveTypes);

// PUT /api/leave/types/:id
router.put('/types/:id', updateLeaveType);

export default router;
