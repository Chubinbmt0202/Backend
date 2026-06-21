import express from 'express';
import { taoDonTangCa, layTatCaDonTangCa, capNhatTrangThaiTangCa, layDonTangCaNhanVien } from '../controllers/tangCaController.js';

const router = express.Router();

router.post('/create', taoDonTangCa);
router.get('/all', layTatCaDonTangCa);
router.put('/status', capNhatTrangThaiTangCa);
router.get('/history/:employeeId', layDonTangCaNhanVien);

export default router;
