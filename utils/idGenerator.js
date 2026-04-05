import crypto from 'crypto';

export const generateId = (prefix) => {
    // Tạo 6 số ngẫu nhiên
    const randomNumbers = crypto.randomInt(100000, 999999).toString();
    // 2 ký tự prefix + 6 số = 8 ký tự
    return `${prefix}${randomNumbers}`;
};

