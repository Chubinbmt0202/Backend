import express from 'express';
import { 
    taoDonTangCa, 
    layTatCaDonTangCa, 
    capNhatTrangThaiTangCa, 
    layDonTangCaNhanVien,
    layCauHinhTangCa,
    capNhatCauHinhTangCa
} from '../controllers/tangCaController.js';

const router = express.Router();

router.post('/create', taoDonTangCa);
router.get('/all', layTatCaDonTangCa);
router.put('/status', capNhatTrangThaiTangCa);
router.get('/history/:employeeId', layDonTangCaNhanVien);
router.get('/config', layCauHinhTangCa);
router.put('/config', capNhatCauHinhTangCa);

export default router;
