import express from 'express';
import { themVaiTro, ganVaiTro, layDanhSachVaiTro } from '../controllers/roleController.js';

const router = express.Router();

router.post('/add', themVaiTro);
router.post('/assign', ganVaiTro);
router.get('/', layDanhSachVaiTro);

export default router;
