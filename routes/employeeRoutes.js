import express from 'express';
import { addEmployee, getEmployees, updateEmployee, deleteEmployee, uploadEmployeeFace, getEmployeeByID } from '../controllers/employeeController.js';

const router = express.Router();

// Định nghĩa route POST /api/employees để thêm nhân viên
router.post('/add', addEmployee);

// Định nghĩa route PUT /api/employees/update/:id để chỉnh sửa nhân viên
router.put('/update/:id', updateEmployee);

// Định nghĩa route DELETE /api/employees/delete/:id để xoá nhân viên
router.delete('/delete/:id', deleteEmployee);

// Định nghĩa route GET /api/employees để lấy danh sách nhân viên
router.get('/getAll', getEmployees);

// lấy 1 nhân viên
router.get('/getByID/:id', getEmployeeByID);

router.post('/upload-face', uploadEmployeeFace);

export default router;
