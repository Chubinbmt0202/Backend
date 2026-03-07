import express from 'express';
import { addEmployee } from '../controllers/employeeController.js';

const router = express.Router();

// Định nghĩa route POST /api/employees để thêm nhân viên
router.post('/', addEmployee);

export default router;
