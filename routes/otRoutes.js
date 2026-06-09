import express from 'express';
import { createOTRequest, getAllOTRequests, updateOTStatus, getEmployeeOTRequests } from '../controllers/otController.js';

const router = express.Router();

router.post('/create', createOTRequest);
router.get('/all', getAllOTRequests);
router.put('/status', updateOTStatus);
router.get('/history/:employeeId', getEmployeeOTRequests);

export default router;
