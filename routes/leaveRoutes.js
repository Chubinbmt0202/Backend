import express from 'express';
import multer from 'multer';
import { taoYeuCauNghiPhep, layDonNghiPhepNhanVien, layTatCaDonNghiPhep, capNhatTrangThaiNghiPhep, layTatCaLoaiNghiPhep, capNhatLoaiNghiPhep } from '../controllers/leaveController.js';


const router = express.Router();

// Cấu hình multer để xử lý file đính kèm (minh chứng)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

// POST /api/leave/create
router.post('/create', upload.single('file'), taoYeuCauNghiPhep);

// GET /api/leave/all
router.get('/all', layTatCaDonNghiPhep);

// GET /api/leave/history/:employeeId
router.get('/history/:employeeId', layDonNghiPhepNhanVien);

// PATCH /api/leave/update-status
router.patch('/update-status', capNhatTrangThaiNghiPhep);

// GET /api/leave/types
router.get('/types', layTatCaLoaiNghiPhep);

// PUT /api/leave/types/:id
router.put('/types/:id', capNhatLoaiNghiPhep);

export default router;
