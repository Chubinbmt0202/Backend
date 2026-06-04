import admin from '../config/firebase.js';

/**
 * Gửi thông báo Push Notification tới một thiết bị cụ thể qua FCM Token hoặc Expo Push Token
 * @param {string} token - FCM Token hoặc Expo Push Token của thiết bị nhận
 * @param {string} title - Tiêu đề thông báo
 * @param {string} body - Nội dung thông báo
 * @param {object} data - Dữ liệu kèm theo thông báo (tùy chọn)
 */
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    // 1. Bỏ qua mock token (thường ở thiết bị giả lập)
    if (token.includes('mock_token')) {
      console.log(`ℹ️ [Mock Push] Bỏ qua gửi thông báo cho thiết bị giả lập. Token: ${token}`);
      return { success: true, message: 'Mock token skipped' };
    }

    // 2. Nếu là Expo Push Token (ExponentPushToken[...])
    if (token.startsWith('ExponentPushToken')) {
      console.log(`📡 Đang gửi thông báo qua Expo Push Service tới: ${token}`);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          data,
        }),
      });

      const result = await response.json();
      console.log('Expo Push Response:', result);
      return result;
    }

    // 3. Nếu là FCM Native Token
    const message = {
      notification: {
        title,
        body,
      },
      data: data, // Các data custom dạng key-value (string)
      token,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent native FCM message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Gửi thông báo tới nhiều thiết bị cùng lúc hỗ trợ cả Expo và FCM
 * @param {string[]} tokens - Danh sách FCM/Expo Token
 * @param {string} title 
 * @param {string} body 
 * @param {object} data 
 */
export const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  try {
    const expoTokens = [];
    const fcmTokens = [];

    for (const token of tokens) {
      if (token.includes('mock_token')) continue;
      if (token.startsWith('ExponentPushToken')) {
        expoTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    }

    // Gửi qua Expo
    if (expoTokens.length > 0) {
      console.log(`📡 Đang gửi ${expoTokens.length} thông báo qua Expo Push Service`);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(
          expoTokens.map(token => ({
            to: token,
            title,
            body,
            data,
          }))
        ),
      });
      const result = await response.json();
      console.log('Expo Multicast Response:', result);
    }

    // Gửi qua FCM
    if (fcmTokens.length > 0) {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`${response.successCount} messages were sent successfully via FCM`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending multicast message:', error);
    throw error;
  }
};
