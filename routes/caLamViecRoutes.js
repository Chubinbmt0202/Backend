import express from 'express';
import { themCaLamViec, layTatCaCaLamViec, capNhatCaLamViec, xoaCaLamViec, layCaLamViecCuaToi } from '../controllers/caLamViecController.js';
const router = express.Router();

router.get('/getAllShifts', layTatCaCaLamViec)
router.get('/myShift/:id', layCaLamViecCuaToi)
router.post('/addShift', themCaLamViec)
router.put('/updateShift/:id', capNhatCaLamViec)
router.delete('/deleteShift/:id', xoaCaLamViec)

export default router