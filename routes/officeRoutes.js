import express from 'express';
import { addOfficeGPS, getOffices, updateOfficeGPS, deleteOffice } from '../controllers/officeController.js';

const router = express.Router();

// GET /api/offices - Lấy danh sách văn phòng và GPS
router.get('/', getOffices);

// POST /api/offices/gps - Thêm mới văn phòng kèm GPS
router.post('/gps', addOfficeGPS);

// PUT /api/offices/gps/:id - Cập nhật văn phòng và GPS
router.put('/gps/:id', updateOfficeGPS);

// DELETE /api/offices/:id - Xóa văn phòng
router.delete('/:id', deleteOffice);

export default router;
