import express from 'express';
import { createOTRequest, getAllOTRequests, updateOTStatus } from '../controllers/otController.js';

const router = express.Router();

router.post('/create', createOTRequest);
router.get('/all', getAllOTRequests);
router.put('/status', updateOTStatus);

export default router;
