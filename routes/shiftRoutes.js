import express from 'express';
import { addShift, getAllShifts, updateShift, deleteShift } from '../controllers/shiftController.js';
const router = express.Router();

router.get('/getAllShifts', getAllShifts)
router.post('/addShift', addShift)
router.put('/updateShift/:id', updateShift)
router.delete('/deleteShift/:id', deleteShift)

export default router