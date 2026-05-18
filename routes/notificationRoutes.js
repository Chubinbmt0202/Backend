import express from 'express';
import { sendPushNotification } from '../utils/notification.js';

const router = express.Router();

// API Test gửi thông báo push
router.post('/send', async (req, res) => {
  const { token, title, body, data } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Thiếu tham số token, title hoặc body' });
  }

  try {
    const result = await sendPushNotification(token, title, body, data);
    res.status(200).json({ message: 'Đã gửi thông báo thành công!', result });
  } catch (error) {
    res.status(500).json({ error: 'Gửi thông báo thất bại', details: error.message });
  }
});

export default router;
