import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

try {
  let serviceAccount = null;

  // Option 1: Nếu bạn có file serviceAccountKey.json, hãy copy nó vào thư mục Backend 
  // và bỏ comment 2 dòng dưới đây (nhớ comment phần Option 2 lại):
  /*
  import { readFileSync } from 'fs';
  serviceAccount = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url)));
  */

  // Option 2: Sử dụng biến môi trường (Khuyên dùng khi deploy)
  if (process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Chuyển đổi \\n thành xuống dòng thực tế
    };
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('🔥 Đã kết nối thành công với Firebase!');
  } else {
    console.warn('⚠️ WARNING: Chưa cấu hình Firebase. Vui lòng thêm serviceAccountKey.json hoặc cấu hình biến môi trường.');
  }
} catch (error) {
  console.error('❌ Lỗi kết nối Firebase:', error);
}

export default admin;
