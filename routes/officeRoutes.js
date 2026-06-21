import express from 'express';
import { 
    themToaDoVanPhong, 
    layDanhSachVanPhong, 
    capNhatToaDoVanPhong, 
    xoaVanPhong,
    capNhatWifiVanPhong,
    xoaWifiVanPhong,
    layTatCaWifi,
    themWifiVanPhong
} from '../controllers/officeController.js';

const router = express.Router();

// GET /api/offices - Lấy danh sách văn phòng và GPS
router.get('/', layDanhSachVanPhong);

// POST /api/offices/gps - Thêm mới văn phòng kèm GPS
router.post('/gps', themToaDoVanPhong);

// PUT /api/offices/gps/:id - Cập nhật văn phòng và GPS
router.put('/gps/:id', capNhatToaDoVanPhong);

// DELETE /api/offices/:id - Xóa văn phòng
router.delete('/:id', xoaVanPhong);

// ==============================
// CÁC ROUTE QUẢN LÝ WIFI
// ==============================

// GET /api/offices/wifi - Lấy danh sách Wifi của tất cả văn phòng
router.get('/wifi', layTatCaWifi);

// POST /api/offices/wifi - Thêm thông tin Wifi (Truyền ID trong body)
router.post('/wifi', themWifiVanPhong);

// PUT /api/offices/wifi/:id - Cập nhật thông tin Wifi của văn phòng
router.put('/wifi/:id', capNhatWifiVanPhong);

// DELETE /api/offices/wifi/:id - Xoá thông tin Wifi của văn phòng (set NULL)
router.delete('/wifi/:id', xoaWifiVanPhong);

export default router;
