import express from 'express';
import { addDepartment, getDepartments, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';

const router = express.Router();

router.post('/add', addDepartment);
router.get('/', getDepartments);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
