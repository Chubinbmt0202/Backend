import express from 'express';
import { themVaiTro, ganVaiTro, layDanhSachVaiTro, capNhatVaiTro, xoaVaiTro } from '../controllers/vaiTroController.js';

const router = express.Router();

router.post('/add', themVaiTro);
router.post('/assign', ganVaiTro);
router.get('/', layDanhSachVaiTro);
router.put('/update/:id', capNhatVaiTro);
router.delete('/delete/:id', xoaVaiTro);

export default router;
