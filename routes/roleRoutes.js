import express from 'express';
import { addRole, assignRole, getRoles } from '../controllers/roleController.js';

const router = express.Router();

router.post('/add', addRole);
router.post('/assign', assignRole);
router.get('/', getRoles);

export default router;
