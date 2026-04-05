import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

// Thêm văn phòng và thiết lập luôn toạ độ GPS
export const addOfficeGPS = async (req, res) => {
    try {
        const { locationName, address, longitude, latitude, radius, wifiName, wifiAddress } = req.body;

        // Validate dữ liệu từ client
        if (!locationName || !longitude || !latitude) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ tên văn phòng, kinh độ và vĩ độ.' 
            });
        }

        const id_van_phong = generateId('VP');

        // Thêm vào bảng VAN_PHONG
        const query = `
            INSERT INTO VAN_PHONG (id_van_phong, ten, dia_chi, kinh_do, vi_do, pham_vi, ten_wifi, dia_chi_wifi) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
        `;
        const values = [
            id_van_phong, 
            locationName, 
            address || '', 
            longitude, 
            latitude, 
            radius || 100,
            wifiName || null,
            wifiAddress || null
        ];

        const result = await pool.query(query, values);

        // 3. Trả kết quả về cho client
        res.status(201).json({
            success: true,
            message: 'Thêm văn phòng thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi thêm văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm văn phòng.' });
    }
};

// Hàm lấy danh sách văn phòng
export const getOffices = async (req, res) => {
    try {
        const query = `
            SELECT 
                id_van_phong,
                ten AS locationName,
                dia_chi AS address,
                kinh_do AS longitude,
                vi_do AS latitude,
                pham_vi AS radius,
                ten_wifi,
                dia_chi_wifi
            FROM VAN_PHONG
            ORDER BY id_van_phong DESC
        `;
        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu văn phòng thành công',
            data: result.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
};

// Cập nhật văn phòng
export const updateOfficeGPS = async (req, res) => {
    try {
        const { id } = req.params;
        const { locationName, address, longitude, latitude, radius, wifiName, wifiAddress } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: 'ID văn phòng không hợp lệ.' });
        }

        const updates = [];
        const values = [];
        let idx = 1;
        
        if (locationName !== undefined) { updates.push(`ten = $${idx++}`); values.push(locationName); }
        if (address !== undefined) { updates.push(`dia_chi = $${idx++}`); values.push(address); }
        if (longitude !== undefined) { updates.push(`kinh_do = $${idx++}`); values.push(longitude); }
        if (latitude !== undefined) { updates.push(`vi_do = $${idx++}`); values.push(latitude); }
        if (radius !== undefined) { updates.push(`pham_vi = $${idx++}`); values.push(radius); }
        if (wifiName !== undefined) { updates.push(`ten_wifi = $${idx++}`); values.push(wifiName); }
        if (wifiAddress !== undefined) { updates.push(`dia_chi_wifi = $${idx++}`); values.push(wifiAddress); }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có dữ liệu cập nhật.' });
        }

        values.push(id);
        const query = `UPDATE VAN_PHONG SET ${updates.join(', ')} WHERE id_van_phong = $${idx} RETURNING *`;
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy văn phòng này.' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Cập nhật văn phòng thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật văn phòng.' });
    }
};

// Xóa văn phòng
export const deleteOffice = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID văn phòng không hợp lệ.' });
        }

        const deleteResult = await pool.query('DELETE FROM VAN_PHONG WHERE id_van_phong = $1 RETURNING id_van_phong', [id]);
        
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy văn phòng này.' });
        }

        res.status(200).json({ success: true, message: 'Xóa văn phòng thành công!' });
    } catch (error) {
        console.error('Lỗi khi xóa văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa văn phòng.' });
    }
};
