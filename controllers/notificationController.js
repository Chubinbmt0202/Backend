import pool from '../config/db.js';
import admin from '../config/firebase.js';
import { generateId } from '../utils/idGenerator.js';

// Hàm nội bộ để tạo thông báo (sử dụng trong hệ thống và API)
export const createNotificationHelper = async (employeeId, title, content, type = 'SYSTEM') => {
    try {
        const id = generateId('TB');

        // 1. Lưu vào PostgreSQL
        const insertQuery = `
            INSERT INTO THONG_BAO (id_thong_bao, id_nhan_vien, tieu_de, noi_dung, loai_thong_bao, da_doc, ngay_tao)
            VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
            RETURNING id_thong_bao, id_nhan_vien, tieu_de, noi_dung, loai_thong_bao, da_doc, ngay_tao;
        `;
        const result = await pool.query(insertQuery, [id, employeeId, title, content, type]);
        const newNotification = result.rows[0];

        // 2. Đồng bộ Realtime lên Firebase Realtime Database
        try {
            await admin.database().ref(`notifications/${employeeId}/${id}`).set({
                id_thong_bao: id,
                id_nhan_vien: employeeId,
                tieu_de: title,
                noi_dung: content,
                loai_thong_bao: type,
                da_doc: false,
                ngay_tao: Date.now()
            });
            console.log(`🔥 Đã đồng bộ thông báo realtime cho nhân viên ${employeeId}: ${title}`);
        } catch (fbErr) {
            console.error('Lỗi khi ghi thông báo lên Firebase:', fbErr.message);
        }

        return newNotification;
    } catch (error) {
        console.error('Lỗi helper createNotificationHelper:', error.message);
        throw error;
    }
};

// API tạo thông báo thủ công (Dành cho Admin hoặc test)
export const createNotification = async (req, res) => {
    try {
        const { employeeId, title, content, type } = req.body;
        if (!employeeId || !title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu các tham số bắt buộc: employeeId, title, content.'
            });
        }

        const notification = await createNotificationHelper(employeeId, title, content, type);
        return res.status(201).json({
            success: true,
            message: 'Tạo thông báo thành công!',
            data: notification
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo thông báo.',
            error: error.message
        });
    }
};

// API lấy danh sách thông báo của 1 nhân viên
export const getEmployeeNotifications = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID nhân viên.'
            });
        }

        const query = `
            SELECT id_thong_bao, tieu_de, noi_dung, loai_thong_bao, da_doc, ngay_tao
            FROM THONG_BAO
            WHERE id_nhan_vien = $1
            ORDER BY ngay_tao DESC;
        `;
        const result = await pool.query(query, [employeeId]);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách thông báo thành công!',
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi lấy thông báo nhân viên:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông báo.',
            error: error.message
        });
    }
};

// API Đánh dấu 1 thông báo là đã đọc
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Cập nhật PostgreSQL
        const query = `
            UPDATE THONG_BAO
            SET da_doc = TRUE
            WHERE id_thong_bao = $1
            RETURNING id_thong_bao, id_nhan_vien, tieu_de, da_doc;
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo.'
            });
        }

        const updatedNotification = result.rows[0];
        const { id_nhan_vien } = updatedNotification;

        // 2. Cập nhật Firebase Realtime Database
        try {
            await admin.database().ref(`notifications/${id_nhan_vien}/${id}`).update({
                da_doc: true
            });
            console.log(`🔥 Đã cập nhật trạng thái đã đọc trên Firebase cho thông báo: ${id}`);
        } catch (fbErr) {
            console.error('Lỗi khi cập nhật đã đọc trên Firebase:', fbErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Đánh dấu đã đọc thành công!',
            data: updatedNotification
        });
    } catch (error) {
        console.error('Lỗi đánh dấu đã đọc:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái thông báo.',
            error: error.message
        });
    }
};

// API Đánh dấu TẤT CẢ thông báo của nhân viên là đã đọc
export const markAllAsRead = async (req, res) => {
    try {
        const { employeeId } = req.body;
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID nhân viên.'
            });
        }

        // 1. Cập nhật PostgreSQL
        const query = `
            UPDATE THONG_BAO
            SET da_doc = TRUE
            WHERE id_nhan_vien = $1 AND da_doc = FALSE;
        `;
        await pool.query(query, [employeeId]);

        // 2. Cập nhật Firebase Realtime Database
        try {
            const dbRef = admin.database().ref(`notifications/${employeeId}`);
            const snapshot = await dbRef.once('value');
            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach((childSnapshot) => {
                    const key = childSnapshot.key;
                    updates[`${key}/da_doc`] = true;
                });
                await dbRef.update(updates);
            }
            console.log(`🔥 Đã đánh dấu đã đọc tất cả thông báo trên Firebase cho nhân viên: ${employeeId}`);
        } catch (fbErr) {
            console.error('Lỗi cập nhật đã đọc tất cả trên Firebase:', fbErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Đã đánh dấu đã đọc toàn bộ thông báo.'
        });
    } catch (error) {
        console.error('Lỗi đánh dấu đã đọc tất cả:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật trạng thái các thông báo.',
            error: error.message
        });
    }
};

// API Xóa 1 thông báo
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Lấy thông tin nhân viên trước khi xóa để đồng bộ Firebase
        const infoQuery = `SELECT id_nhan_vien FROM THONG_BAO WHERE id_thong_bao = $1;`;
        const infoResult = await pool.query(infoQuery, [id]);

        if (infoResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo để xóa.'
            });
        }

        const { id_nhan_vien } = infoResult.rows[0];

        // 2. Xóa trong PostgreSQL
        const deleteQuery = `DELETE FROM THONG_BAO WHERE id_thong_bao = $1;`;
        await pool.query(deleteQuery, [id]);

        // 3. Xóa trên Firebase Realtime Database
        try {
            await admin.database().ref(`notifications/${id_nhan_vien}/${id}`).remove();
            console.log(`🔥 Đã xóa thông báo trên Firebase: ${id}`);
        } catch (fbErr) {
            console.error('Lỗi xóa thông báo trên Firebase:', fbErr.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa thông báo thành công!'
        });
    } catch (error) {
        console.error('Lỗi khi xóa thông báo:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa thông báo.',
            error: error.message
        });
    }
};
