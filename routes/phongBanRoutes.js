import express from 'express';
import { themPhongBan, layDanhSachPhongBan, capNhatPhongBan, xoaPhongBan } from '../controllers/phongBanController.js';

const router = express.Router();

router.post('/add', themPhongBan);
router.get('/', layDanhSachPhongBan);
router.put('/:id', capNhatPhongBan);
router.delete('/:id', xoaPhongBan);

export default router;
