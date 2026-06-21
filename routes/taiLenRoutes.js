import express from 'express';
import multer from 'multer';
import { taiLenTep } from '../controllers/taiLenController.js';

const router = express.Router();

// Sử dụng bộ nhớ đệm (memoryStorage) vì chúng ta sẽ đẩy thẳng buffer lên Supabase
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn file 5MB
});

// POST /api/upload
router.post('/', upload.single('file'), taiLenTep);

export default router;
