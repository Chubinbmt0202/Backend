import pool from '../config/db.js';

// Thêm văn phòng và thiết lập luôn toạ độ GPS (Bán kính mặc định 100m)
export const addOfficeGPS = async (req, res) => {
    try {
        const { locationName, address, longitude, latitude, radius } = req.body;

        // Validate dữ liệu từ client
        if (!locationName || !longitude || !latitude) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ tên văn phòng, kinh độ và vĩ độ.' 
            });
        }

        // Bắt đầu Transaction để đảm bảo tính toàn vẹn dữ liệu
        await pool.query('BEGIN');

        // 1. Thêm vào bảng VAN_PHONG
        const officeResult = await pool.query(
            `INSERT INTO VAN_PHONG (ten, dia_chi) VALUES ($1, $2) RETURNING id_van_phong, ten, dia_chi`,
            [locationName, address || '']
        );
        const newOffice = officeResult.rows[0];

        // 2. Thêm vào bảng GPS (Tham chiếu id_van_phong vừa tạo)
        const gpsResult = await pool.query(
            `INSERT INTO GPS (id_van_phong, kinh_do, vi_do, pham_vi) VALUES ($1, $2, $3, $4) RETURNING id_gps, kinh_do, vi_do, pham_vi`,
            [newOffice.id_van_phong, longitude, latitude, radius || 100] // Nếu không có radius thì mặc định 100 mét
        );
        const newGps = gpsResult.rows[0];

        // Hoàn tất Transaction
        await pool.query('COMMIT');

        // 3. Trả kết quả về cho client
        res.status(201).json({
            success: true,
            message: 'Thêm văn phòng và vị trí chấm công GPS thành công!',
            data: {
                ...newOffice,
                gps: newGps
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK'); // Hoàn tác nếu có lỗi
        console.error('Lỗi khi thêm vị trí GPS văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi thêm văn phòng.' });
    }
};

// Hàm lấy danh sách văn phòng (kèm GPS)
export const getOffices = async (req, res) => {
    try {
        const query = `
            SELECT 
                vp.id_van_phong,
                vp.ten AS locationName,
                vp.dia_chi AS address,
                g.id_gps,
                g.kinh_do AS longitude,
                g.vi_do AS latitude,
                g.pham_vi AS radius
            FROM VAN_PHONG vp
            LEFT JOIN GPS g ON vp.id_van_phong = g.id_van_phong
            ORDER BY vp.id_van_phong DESC
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

// Cập nhật vị trí GPS văn phòng
export const updateOfficeGPS = async (req, res) => {
    try {
        const { id } = req.params;
        const { locationName, address, longitude, latitude, radius } = req.body;

        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID văn phòng không hợp lệ.' });
        }

        await pool.query('BEGIN');

        // Cập nhật VAN_PHONG nếu có dữ liệu
        if (locationName !== undefined || address !== undefined) {
            const updates = [];
            const values = [];
            let idx = 1;
            
            if (locationName !== undefined) { updates.push(`ten = $${idx++}`); values.push(locationName); }
            if (address !== undefined) { updates.push(`dia_chi = $${idx++}`); values.push(address); }
            
            if (updates.length > 0) {
                values.push(id);
                const query = `UPDATE VAN_PHONG SET ${updates.join(', ')} WHERE id_van_phong = $${idx}`;
                await pool.query(query, values);
            }
        }

        // Cập nhật GPS nếu có dữ liệu
        if (longitude !== undefined || latitude !== undefined || radius !== undefined) {
            const updates = [];
            const values = [];
            let idx = 1;

            if (longitude !== undefined) { updates.push(`kinh_do = $${idx++}`); values.push(longitude); }
            if (latitude !== undefined) { updates.push(`vi_do = $${idx++}`); values.push(latitude); }
            if (radius !== undefined) { updates.push(`pham_vi = $${idx++}`); values.push(radius); }

            if (updates.length > 0) {
                values.push(id);
                const query = `UPDATE GPS SET ${updates.join(', ')} WHERE id_van_phong = $${idx}`;
                await pool.query(query, values);
            }
        }

        await pool.query('COMMIT');
        res.status(200).json({ success: true, message: 'Cập nhật văn phòng và vị trí GPS thành công!' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Lỗi khi cập nhật vị trí GPS văn phòng:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật văn phòng.' });
    }
};

// Xóa văn phòng
export const deleteOffice = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID văn phòng không hợp lệ.' });
        }

        // GPS table has ON DELETE CASCADE for id_van_phong, so we just delete the office.
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
