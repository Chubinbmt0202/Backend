import admin from '../config/firebase.js';

/**
 * Gửi thông báo Push Notification tới một thiết bị cụ thể qua FCM Token
 * @param {string} token - FCM Token của thiết bị nhận
 * @param {string} title - Tiêu đề thông báo
 * @param {string} body - Nội dung thông báo
 * @param {object} data - Dữ liệu kèm theo thông báo (tùy chọn)
 */
export const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data, // Các data custom dạng key-value (string)
      token,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Gửi thông báo tới nhiều thiết bị cùng lúc
 * @param {string[]} tokens - Danh sách FCM Token
 * @param {string} title 
 * @param {string} body 
 * @param {object} data 
 */
export const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    return response;
  } catch (error) {
    console.error('Error sending multicast message:', error);
    throw error;
  }
};
