import express from 'express';
import { dangNhap, dangXuat } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', dangNhap);
router.post('/logout', dangXuat);

export default router;
