import express from 'express';
import { addDepartment, getDepartments } from '../controllers/departmentController.js';

const router = express.Router();

router.post('/add', addDepartment);
router.get('/', getDepartments);

export default router;
