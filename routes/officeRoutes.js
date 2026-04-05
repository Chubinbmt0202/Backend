import express from 'express';
import { 
    addOfficeGPS, 
    getOffices, 
    updateOfficeGPS, 
    deleteOffice,
    updateOfficeWifi,
    deleteOfficeWifi,
    getAllWifis,
    addOfficeWifi
} from '../controllers/officeController.js';

const router = express.Router();

// GET /api/offices - Lấy danh sách văn phòng và GPS
router.get('/', getOffices);

// POST /api/offices/gps - Thêm mới văn phòng kèm GPS
router.post('/gps', addOfficeGPS);

// PUT /api/offices/gps/:id - Cập nhật văn phòng và GPS
router.put('/gps/:id', updateOfficeGPS);

// DELETE /api/offices/:id - Xóa văn phòng
router.delete('/:id', deleteOffice);

// ==============================
// CÁC ROUTE QUẢN LÝ WIFI
// ==============================

// GET /api/offices/wifi - Lấy danh sách Wifi của tất cả văn phòng
router.get('/wifi', getAllWifis);

// POST /api/offices/wifi - Thêm thông tin Wifi (Truyền ID trong body)
router.post('/wifi', addOfficeWifi);

// PUT /api/offices/wifi/:id - Cập nhật thông tin Wifi của văn phòng
router.put('/wifi/:id', updateOfficeWifi);

// DELETE /api/offices/wifi/:id - Xoá thông tin Wifi của văn phòng (set NULL)
router.delete('/wifi/:id', deleteOfficeWifi);

export default router;
