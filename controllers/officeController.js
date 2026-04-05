import pool from '../config/db.js';
import { generateId } from '../utils/idGenerator.js';

// Thêm văn phòng và thiết lập luôn toạ độ GPS
export const addOfficeGPS = async (req, res) => {
    try {
        const { locationName, address, longitude, latitude, radius, wifiName, wifiAddress } = req.body;
        console.log("Dữ liệu nhận được khi thêm địa chỉ văn phòng: ", req.body);
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
            INSERT INTO VAN_PHONG (id_van_phong, ten, dia_chi, kinh_do, vi_do, pham_vi) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `;
        const values = [
            id_van_phong,
            locationName,
            address || '',
            longitude,
            latitude,
            radius || 100
        ];

        const result = await pool.query(query, values);

        // Thêm wifi mặc định nếu có truyền vào
        if (wifiName && wifiAddress) {
            const id_wifi = generateId('WF');
            await pool.query(
                'INSERT INTO WIFI_VAN_PHONG (id_wifi, ten_wifi, dia_chi_mac, id_van_phong) VALUES ($1, $2, $3, $4)',
                [id_wifi, wifiName, wifiAddress, id_van_phong]
            );
        }

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
                pham_vi AS radius
            FROM VAN_PHONG
            ORDER BY id_van_phong DESC
        `;
        const result = await pool.query(query);
        console.log("Lấy tất cả văn phòng: ", result.rows);

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

        let updatedData = {};

        if (updates.length > 0) {
            values.push(id);
            const query = `UPDATE VAN_PHONG SET ${updates.join(', ')} WHERE id_van_phong = $${idx} RETURNING *`;
            const result = await pool.query(query, values);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy văn phòng này.' });
            }
            updatedData = result.rows[0];
        } else {
             // Trả về dữ liệu cũ nếu không có cập nhật nào được truyền lên
            const checkQuery = `SELECT * FROM VAN_PHONG WHERE id_van_phong = $1`;
            const checkResult = await pool.query(checkQuery, [id]);
            if (checkResult.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy văn phòng này.' });
            }
            updatedData = checkResult.rows[0];
        }

        // Wifi được update qua API riêng (updateOfficeWifi) nên ta bỏ qua ở đây.

        res.status(200).json({
            success: true,
            message: 'Cập nhật văn phòng thành công!',
            data: updatedData
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

        await pool.query('BEGIN');

        // 1. Nếu văn phòng này có tạo DIEM_CHAM_CONG, có thể nó đang được liên kết trong CHAM_CONG
        // => Phải cập nhật CHAM_CONG set id_diem_cham_cong = NULL trước để gỡ foreign key.
        await pool.query(`
            UPDATE CHAM_CONG 
            SET id_diem_cham_cong = NULL 
            WHERE id_diem_cham_cong IN (
                SELECT id_diem_cham_cong FROM DIEM_CHAM_CONG WHERE id_van_phong = $1
            )
        `, [id]);

        // 2. Xoá DIEM_CHAM_CONG liên quan đến văn phòng
        await pool.query('DELETE FROM DIEM_CHAM_CONG WHERE id_van_phong = $1', [id]);

        // 3. Xoá VAN_PHONG
        const deleteResult = await pool.query('DELETE FROM VAN_PHONG WHERE id_van_phong = $1 RETURNING id_van_phong', [id]);

        if (deleteResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Không tìm thấy văn phòng này.' });
        }

        await pool.query('COMMIT');
        res.status(200).json({ success: true, message: 'Xóa văn phòng thành công!' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Lỗi khi xóa văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi xóa văn phòng.' });
    }
};

// =======================================
// Các API dành riêng cho Wifi Văn Phòng
// =======================================

// Thêm/Cập nhật thông tin Wifi cho văn phòng (Sử dụng params ID)
export const updateOfficeWifi = async (req, res) => {
    try {
        const { id } = req.params;
        const { wifiName, wifiAddress } = req.body;

        if (!id || !wifiName || !wifiAddress) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ID văn phòng, Tên Wifi (wifiName) và Địa chỉ MAC (wifiAddress).'
            });
        }

        const query = `
            UPDATE WIFI_VAN_PHONG 
            SET ten_wifi = $1, dia_chi_mac = $2 
            WHERE id_wifi = $3 OR dia_chi_mac = $3
            RETURNING *
        `;
        const result = await pool.query(query, [wifiName, wifiAddress, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình Wifi này.' });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật Wifi cho văn phòng thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật Wifi:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật Wifi.' });
    }
};

// Thêm thông tin Wifi (Truyền id_van_phong trong body)
export const addOfficeWifi = async (req, res) => {
    try {
        const { id_van_phong, wifiName, wifiAddress } = req.body;

        if (!id_van_phong || !wifiName || !wifiAddress) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ id_van_phong, wifiName và wifiAddress trong body.'
            });
        }

        const id_wifi = generateId('WF');

        const query = `
            INSERT INTO WIFI_VAN_PHONG (id_wifi, ten_wifi, dia_chi_mac, id_van_phong) 
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [id_wifi, wifiName, wifiAddress, id_van_phong]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy văn phòng với ID đã cung cấp.' });
        }

        res.status(200).json({
            success: true,
            message: 'Đã thêm/cập nhật Wifi cho văn phòng thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi thêm Wifi:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm Wifi.' });
    }
};

// Xoá thông tin Wifi khỏi văn phòng (Set NULL)
export const deleteOfficeWifi = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: 'Địa chỉ MAC Wifi hoặc ID Wifi không hợp lệ.' });
        }

        const query = `
            DELETE FROM WIFI_VAN_PHONG 
            WHERE id_wifi = $1 OR dia_chi_mac = $1 
            RETURNING *
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin Wifi để xoá.' });
        }

        res.status(200).json({
            success: true,
            message: 'Đã xoá thông tin Wifi hiện tại thành công!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi xoá Wifi:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi xoá Wifi.' });
    }
};

// Lấy danh sách Wifi (những văn phòng đã cấu hình Wifi)
export const getAllWifis = async (req, res) => {
    try {
        const query = `
            SELECT 
                vp.id_van_phong,
                vp.ten AS "locationName",
                vp.dia_chi AS address,
                wf.id_wifi,
                wf.ten_wifi AS "wifiName",
                wf.dia_chi_mac AS "wifiAddress"
            FROM WIFI_VAN_PHONG wf
            JOIN VAN_PHONG vp ON vp.id_van_phong = wf.id_van_phong
            ORDER BY vp.id_van_phong DESC, wf.id_wifi ASC
        `;
        const result = await pool.query(query);
        console.log(result.rows);

        // Gộp nhóm Wifi theo Văn Phòng
        const groupedData = result.rows.reduce((acc, row) => {
            const { id_van_phong, locationName, address, id_wifi, wifiName, wifiAddress } = row;

            // Tìm xem văn phòng đã có trong danh sách kết quả chưa
            let office = acc.find(item => item.id_van_phong === id_van_phong);

            if (!office) {
                // Nếu chưa có, tạo cấu trúc mới
                office = {
                    id_van_phong,
                    locationName,
                    address,
                    wifis: []
                };
                acc.push(office);
            }

            // Đưa wifi vào danh sách của văn phòng đó
            office.wifis.push({
                id_wifi,
                wifiName,
                wifiAddress
            });

            return acc;
        }, []);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách Wifi thành công',
            data: groupedData
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách Wifi:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách Wifi.' });
    }
};
