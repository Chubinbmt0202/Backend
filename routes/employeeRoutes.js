import express from 'express';
import { addEmployee, getEmployees } from '../controllers/employeeController.js';

const router = express.Router();

// Định nghĩa route POST /api/employees để thêm nhân viên
router.post('/', addEmployee);

// Định nghĩa route GET /api/employees để lấy danh sách nhân viên
router.get('/', getEmployees);

export default router;
