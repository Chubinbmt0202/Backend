import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { findBestMatch } from '../utils/faceUtils.js';
import { generateId } from '../utils/idGenerator.js';

const normalizeEmbedding = (raw) => {
    if (raw == null) return raw;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    return raw;
};

// Controller API Thêm nhân viên mới (TAI_KHOAN + NHAN_VIEN)
export const addEmployee = async (req, res) => {
    console.log("Dữ liệu nhận được:", req.body);
    try {
        const {
            username,
            password,
            full_name,
            role_id,
            phone_number,
            date_of_birth,
            address,
            department_id
        } = req.body;

        // Kiểm tra dữ liệu đầu vào cơ bản
        if (!username || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ username, password và full_name.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const id_tai_khoan = generateId('TK');
        const id_nhan_vien = generateId('NV');

        await pool.query('BEGIN');

        // Thêm tài khoản
        const newAccount = await pool.query(
            `
                INSERT INTO TAI_KHOAN (id_tai_khoan, ten_dang_nhap, mat_khau, id_vai_tro, trang_thai, ngay_tao)
                VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
                RETURNING id_tai_khoan, ten_dang_nhap, id_vai_tro, trang_thai, ngay_tao
            `,
            [id_tai_khoan, username, hashedPassword, role_id || 'VT003'] // Mặc định role_id = VT003 (Nhân viên)
        );

        // Thêm nhân viên
        const newEmployee = await pool.query(
            `
                INSERT INTO NHAN_VIEN (id_nhan_vien, ho_va_ten, ngay_sinh, so_dien_thoai, dia_chi, id_tai_khoan, id_phong_ban)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id_nhan_vien, id_tai_khoan, ho_va_ten, ngay_sinh, so_dien_thoai, dia_chi, id_phong_ban
            `,
            [
                id_nhan_vien,
                full_name,
                date_of_birth || null,
                phone_number || null,
                address || null,
                id_tai_khoan,
                department_id || null
            ]
        );

        await pool.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Thêm nhân viên mới thành công!',
            data: {
                tai_khoan: newAccount.rows[0],
                nhan_vien: newEmployee.rows[0]
            }
        });

    } catch (error) {
        console.error('Lỗi khi thêm nhân viên:', error.message);
        try { await pool.query('ROLLBACK'); } catch { }

        // Bắt lỗi trùng lặp username
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu bị trùng (username).'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Controller API Lấy danh sách nhân viên
export const getEmployees = async (req, res) => {
    try {
        const employees = await pool.query(
            `
                SELECT
                    nv.id_nhan_vien,
                    nv.ho_va_ten AS full_name,
                    nv.ngay_sinh AS date_of_birth,
                    nv.so_dien_thoai AS phone_number,
                    nv.dia_chi AS address,
                    nv.id_phong_ban AS department_id,
                    pb.mo_ta AS department_name,
                    tk.id_tai_khoan,
                    tk.ten_dang_nhap AS username,
                    tk.id_vai_tro,
                    vt.ten_vai_tro AS role_name,
                    tk.trang_thai,
                    tk.ngay_tao AS created_at,
                    nv.du_lieu_khuon_mat
                FROM NHAN_VIEN nv
                LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
                LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
                LEFT JOIN PHONG_BAN pb ON pb.id_phong_ban = nv.id_phong_ban
                ORDER BY tk.ngay_tao DESC
            `
        );

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách nhân viên thành công',
            data: employees.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Lấy danh sách nhân viên theo phòng ban
export const getEmployeesByDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("ID phòng ban: ", id)
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID phòng ban không hợp lệ.'
            });
        }

        const employees = await pool.query(
            `
                SELECT
                    nv.id_nhan_vien,
                    nv.ho_va_ten AS full_name,
                    nv.ngay_sinh AS date_of_birth,
                    nv.so_dien_thoai AS phone_number,
                    nv.dia_chi AS address,
                    nv.id_phong_ban AS department_id,
                    pb.mo_ta AS department_name,
                    tk.id_tai_khoan,
                    tk.ten_dang_nhap AS username,
                    tk.id_vai_tro,
                    vt.ten_vai_tro AS role_name,
                    tk.trang_thai,
                    tk.ngay_tao AS created_at,
                    nv.du_lieu_khuon_mat
                FROM NHAN_VIEN nv
                LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
                LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
                LEFT JOIN PHONG_BAN pb ON pb.id_phong_ban = nv.id_phong_ban
                WHERE nv.id_phong_ban = $1
                ORDER BY tk.ngay_tao DESC
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách nhân viên theo phòng ban thành công',
            data: employees.rows
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhân viên theo phòng ban:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Lấy 1 nhân viên
export const getEmployeeByID = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("ID nhân viên: ", id)

        // Kiểm tra id có hợp lệ không
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        const query = `
            SELECT
                nv.id_nhan_vien,
                nv.ho_va_ten AS full_name,
                nv.ngay_sinh AS date_of_birth,
                nv.so_dien_thoai AS phone_number,
                nv.dia_chi AS address,
                nv.id_phong_ban AS department_id,
                pb.mo_ta AS department_name,
                tk.id_tai_khoan,
                tk.ten_dang_nhap AS username,
                tk.id_vai_tro,
                vt.ten_vai_tro AS role_name,
                tk.trang_thai,
                tk.ngay_tao AS created_at,
                nv.du_lieu_khuon_mat
            FROM NHAN_VIEN nv
            LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
            LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
            LEFT JOIN PHONG_BAN pb ON pb.id_phong_ban = nv.id_phong_ban
            WHERE nv.id_nhan_vien = $1
            LIMIT 1
        `;

        const employee = await pool.query(query, [id]);
        console.log("id nhân viên khi lấy chi tiết: ", id)

        // Kiểm tra xem có tìm thấy nhân viên không
        if (employee.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên với ID này.'
            });
        }

        // Lấy lịch sử chấm công của nhân viên
        const attendanceQuery = `
            SELECT
                cc.id_cham_cong,
                cc.gio_vao::date AS log_date,
                TO_CHAR(cc.gio_vao::date, 'TMDay') AS day_of_week,
                cc.gio_vao AS check_in_time,
                cc.gio_ra AS check_out_time,
                cc.ghi_chu AS note,
                CASE
                    WHEN cc.gio_vao IS NULL THEN 'none'
                    WHEN cc.gio_ra IS NULL THEN 'checked_in'
                    ELSE 'checked_out'
                END AS status,
                ca.ten_ca AS shift_name
            FROM CHAM_CONG cc
            LEFT JOIN CA_LAM_VIEC ca ON ca.id_ca_lam_viec = cc.id_ca_lam
            WHERE cc.id_nhan_vien = $1
            ORDER BY cc.gio_vao DESC
            LIMIT 30
        `;

        const attendance = await pool.query(attendanceQuery, [id]);

        // Trả về dữ liệu thành công
        res.status(200).json({
            success: true,
            message: 'Lấy thông tin nhân viên thành công',
            data: {
                ...employee.rows[0],
                attendance_history: attendance.rows
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy thông tin 1 nhân viên:', error.message);
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Chỉnh sửa thông tin nhân viên
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            role,
            password,
            email,
            phone_number,
            date_of_birth,
            gender,
            address,
            title,
            department_id,
            start_date,
            employee_code,
            status
        } = req.body;

        // Kiểm tra id có hợp lệ không
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        // Kiểm tra có dữ liệu nào để cập nhật không
        if (
            !full_name && !role && !password &&
            !email && !phone_number && !date_of_birth && !gender && !address &&
            !title && !department_id && !start_date && !employee_code && !status
        ) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp ít nhất một trường để cập nhật (full_name, role, password).'
            });
        }

        // Lấy id_tai_khoan để update cả 2 bảng
        const existing = await pool.query(
            `SELECT id_tai_khoan FROM NHAN_VIEN WHERE id_nhan_vien = $1 LIMIT 1`,
            [id]
        );
        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên với ID này.'
            });
        }

        const id_tai_khoan = existing.rows[0].id_tai_khoan;

        await pool.query('BEGIN');

        // Update NHAN_VIEN
        const nvFields = [];
        const nvValues = [];
        let nvIdx = 1;

        if (full_name) { nvFields.push(`ho_va_ten = $${nvIdx++}`); nvValues.push(full_name); }
        if (date_of_birth) { nvFields.push(`ngay_sinh = $${nvIdx++}`); nvValues.push(date_of_birth); }
        if (address) { nvFields.push(`dia_chi = $${nvIdx++}`); nvValues.push(address); }
        if (department_id) { nvFields.push(`id_phong_ban = $${nvIdx++}`); nvValues.push(department_id); }

        if (nvFields.length > 0) {
            nvValues.push(id);
            await pool.query(
                `UPDATE NHAN_VIEN SET ${nvFields.join(', ')} WHERE id_nhan_vien = $${nvIdx}`,
                nvValues
            );
        }

        // Update TAI_KHOAN
        const tkFields = [];
        const tkValues = [];
        let tkIdx = 1;

        if (role) { tkFields.push(`id_vai_tro = $${tkIdx++}`); tkValues.push(role); }
        if (status !== undefined) { tkFields.push(`trang_thai = $${tkIdx++}`); tkValues.push(status); }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            tkFields.push(`mat_khau = $${tkIdx++}`);
            tkValues.push(hashedPassword);
        }

        if (tkFields.length > 0 && id_tai_khoan) {
            tkValues.push(id_tai_khoan);
            await pool.query(
                `UPDATE TAI_KHOAN SET ${tkFields.join(', ')} WHERE id_tai_khoan = $${tkIdx}`,
                tkValues
            );
        }

        await pool.query('COMMIT');

        // Trả lại bản ghi mới nhất
        const updated = await pool.query(
            `
                SELECT
                    nv.id_nhan_vien,
                    nv.ho_va_ten AS full_name,
                    nv.ngay_sinh AS date_of_birth,
                    nv.dia_chi AS address,
                    nv.id_phong_ban AS department_id,
                    pb.mo_ta AS department_name,
                    tk.id_tai_khoan,
                    tk.ten_dang_nhap AS username,
                    tk.id_vai_tro,
                    vt.ten_vai_tro AS role_name,
                    tk.trang_thai,
                    tk.ngay_tao AS created_at,
                    nv.du_lieu_khuon_mat
                FROM NHAN_VIEN nv
                LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
                LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
                LEFT JOIN PHONG_BAN pb ON pb.id_phong_ban = nv.id_phong_ban
                WHERE nv.id_nhan_vien = $1
                LIMIT 1
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin nhân viên thành công!',
            data: updated.rows[0]
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật nhân viên:', error.message);
        try { await pool.query('ROLLBACK'); } catch { }
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
};

// Xoá 1 nhân viên
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra id có hợp lệ không
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        const existing = await pool.query(
            `SELECT id_nhan_vien, id_tai_khoan, ho_va_ten FROM NHAN_VIEN WHERE id_nhan_vien = $1 LIMIT 1`,
            [id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên với ID này.'
            });
        }

        const id_tai_khoan = existing.rows[0].id_tai_khoan;

        await pool.query('BEGIN');
        await pool.query(`DELETE FROM NHAN_VIEN WHERE id_nhan_vien = $1`, [id]);
        if (id_tai_khoan) {
            await pool.query(`DELETE FROM TAI_KHOAN WHERE id_tai_khoan = $1`, [id_tai_khoan]);
        }
        await pool.query('COMMIT');

        res.status(200).json({
            success: true,
            message: 'Xoá nhân viên thành công!',
            data: { id_nhan_vien: id, id_tai_khoan: id_tai_khoan }
        });

    } catch (error) {
        console.error('Lỗi khi xoá nhân viên:', error.message);
        try { await pool.query('ROLLBACK'); } catch { }
        res.status(500).json({
            success: false,
            message: 'Lỗi server, vui lòng thử lại sau.'
        });
    }
}

// Controller API Upload ảnh khuôn mặt
export const uploadEmployeeFace = async (req, res) => {
    try {
        // 1. Lấy dữ liệu từ Mobile gửi lên
        // Lưu ý: Client (React Native) phải gửi body dạng { userId: ..., embeddings: [...] }
        const { userId, embedding } = req.body;

        console.log(`Nhận yêu cầu cập nhật khuôn mặt cho User ID: ${userId}`);

        // 2. Kiểm tra tính hợp lệ cơ bản
        if (!userId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin userId" });
        }

        if (!embedding || !Array.isArray(embedding) || embedding.length !== 3) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu khuôn mặt không hợp lệ (Bắt buộc phải có đúng 3 góc ảnh)"
            });
        }

        // 3. Kiểm tra chi tiết: Đảm bảo cả 3 mảng con đều là mảng 128 số của MobileFaceNet
        for (let i = 0; i < embedding.length; i++) {
            if (!Array.isArray(embedding[i]) || embedding[i].length !== 192) {
                return res.status(400).json({
                    success: false,
                    message: `Vector ở vị trí thứ ${i + 1} bị lỗi. Yêu cầu mảng 192 số, nhưng nhận được ${embedding[i]?.length || 0} số.`
                });
            }
        }

        // 4. Lưu vào Database (PostgreSQL)
        // PostgreSQL cột JSONB yêu cầu truyền vào một chuỗi JSON
        const embeddingJSON = JSON.stringify(embedding);

        const updateQuery = `
            UPDATE NHAN_VIEN
            SET du_lieu_khuon_mat = $1::jsonb
            WHERE id_nhan_vien = $2
            RETURNING id_nhan_vien, ho_va_ten;
        `;

        // Chạy query (Sử dụng pool từ db.js của bạn)
        const result = await pool.query(updateQuery, [embeddingJSON, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng trong hệ thống" });
        }

        // 5. Trả về kết quả thành công cho Mobile
        return res.status(200).json({
            success: true,
            message: "Đã đăng ký 3 góc khuôn mặt thành công!",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Lỗi khi lưu khuôn mặt:", error);
        return res.status(500).json({ success: false, message: "Lỗi server nội bộ" });
    }
};

// Controller API Yêu cầu cập nhật lại khuôn mặt
export const requestFaceUpdate = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID nhân viên không hợp lệ.'
            });
        }

        const updateQuery = `
            UPDATE NHAN_VIEN
            SET du_lieu_khuon_mat = NULL
            WHERE id_nhan_vien = $1
            RETURNING id_nhan_vien, ho_va_ten;
        `;

        const result = await pool.query(updateQuery, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Yêu cầu cập nhật khuôn mặt đã được ghi nhận. Dữ liệu cũ đã bị xoá.",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Lỗi khi yêu cầu cập nhật khuôn mặt:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ"
        });
    }
};

/**
 * Controller API Nhận diện khuôn mặt (Identify)
 * Tìm xem khuôn mặt này là của nhân viên nào trong hệ thống
 */
export const recognizeEmployeeFace = async (req, res) => {
    try {
        const { userId, embedding } = req.body;
        console.log(`Đang xác thực khuôn mặt cho User ID: ${userId}`);

        // SỬA LỖI: Yêu cầu mảng 128 số (MobileFaceNet)
        if (!embedding || !Array.isArray(embedding) || embedding.length !== 192) {
            return res.status(400).json({
                success: false,
                message: "Dữ liệu khuôn mặt không hợp lệ (Yêu cầu mảng 192 số)."
            });
        }

        // 1. Lấy thông tin nhân viên theo userId
        const query = `
            SELECT
                nv.id_nhan_vien,
                tk.ten_dang_nhap AS username,
                nv.ho_va_ten AS full_name,
                vt.ten_vai_tro AS role,
                nv.du_lieu_khuon_mat
            FROM NHAN_VIEN nv
            LEFT JOIN TAI_KHOAN tk ON tk.id_tai_khoan = nv.id_tai_khoan
            LEFT JOIN VAI_TRO vt ON vt.id_vai_tro = tk.id_vai_tro
            WHERE (nv.id_nhan_vien = $1 OR nv.id_tai_khoan = $1) AND nv.du_lieu_khuon_mat IS NOT NULL
            LIMIT 1
        `;
        const result = await pool.query(query, [userId]);

        // Nếu không tìm thấy dòng nào
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên hoặc nhân viên này chưa đăng ký khuôn mặt."
            });
        }

        // 2. Lấy dữ liệu của user duy nhất vừa query ra
        const user = result.rows[0];

        // Đảm bảo parse mảng JSON nếu Database trả về kiểu chuỗi String
        const storedEmbeddings = normalizeEmbedding(user.du_lieu_khuon_mat);

        // 3. Tiến hành so sánh ảnh camera gửi lên với 3 góc mặt đã lưu
        const match = findBestMatch(embedding, storedEmbeddings);
        const minSimilarity = 80; // Ngưỡng nhận diện (80%)

        // 4. Kiểm tra kết quả và trả về
        if (match.bestSimilarity >= minSimilarity) {
            return res.status(200).json({
                success: true,
                message: `Xác thực thành công. Độ tương đồng: ${match.bestSimilarity.toFixed(2)}%`,
                data: {
                    id_nhan_vien: user.id_nhan_vien,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role,
                    similarity: match.bestSimilarity.toFixed(2) + '%',
                    distance: match.bestDistance.toFixed(4)
                }
            });
        } else {
            return res.status(401).json({ // Dùng mã 401 Unauthorized khi sai khuôn mặt
                success: false,
                message: "Khuôn mặt không khớp. Vui lòng thử lại!",
                bestSimilarity: match.bestSimilarity.toFixed(2) + '%'
            });
        }

    } catch (error) {
        console.error("Lỗi khi xác thực khuôn mặt:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server nội bộ"
        });
    }
};



