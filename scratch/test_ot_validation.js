import pool from '../config/db.js';

async function runTest() {
    console.log("=== BẮT ĐẦU KIỂM TRA ĐĂNG KÝ TĂNG CA ===");
    try {
        // 1. Lấy một nhân viên bất kỳ để test
        const empRes = await pool.query("SELECT id_nhan_vien, ho_va_ten FROM NHAN_VIEN LIMIT 1");
        if (empRes.rowCount === 0) {
            console.error("Không có nhân viên nào trong database để test.");
            return;
        }
        const emp = empRes.rows[0];
        const employeeId = emp.id_nhan_vien;
        console.log(`Nhân viên dùng để test: ${emp.ho_va_ten} (${employeeId})`);

        const testDate = '2026-06-25'; // Dùng một ngày cố định để test

        // Dọn dẹp dữ liệu cũ (nếu có)
        await pool.query("DELETE FROM DON_DANG_KY_OT WHERE id_nhan_vien = $1 AND ngay_dang_ky_ot = $2", [employeeId, testDate]);
        await pool.query("DELETE FROM CHAM_CONG WHERE id_nhan_vien = $1 AND gio_vao::date = $2::date", [employeeId, testDate]);

        // TEST TRƯỜNG HỢP 1: Chưa có chấm công ca chính (chưa check-in, chưa check-out)
        console.log("\n--- TEST 1: Chưa có chấm công ca chính ---");
        let payload = {
            employeeId,
            otDate: testDate,
            startTime: '17:30',
            expectedEndTime: '20:30',
            reason: 'Test OT validation case 1'
        };

        let response = await fetch('http://localhost:3001/api/ot/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        let result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Success: ${result.success}`);
        console.log(`Message: ${result.message}`);
        if (response.status === 400 && result.message.includes('chưa hoàn thành chấm công')) {
            console.log("✅ TEST 1 THÀNH CÔNG: Đã chặn thành công khi chưa check-in!");
        } else {
            console.error("❌ TEST 1 THẤT BẠI!");
        }

        // TEST TRƯỜNG HỢP 2: Đã check-in nhưng chưa check-out
        console.log("\n--- TEST 2: Đã check-in nhưng chưa check-out ---");
        // Giả lập chấm công vào (chưa có giờ ra)
        await pool.query(
            `INSERT INTO CHAM_CONG (id_cham_cong, id_nhan_vien, gio_vao, ghi_chu) 
             VALUES ('CC999999', $1, '2026-06-25 08:00:00', 'Check-in test ca chính')`,
            [employeeId]
        );

        response = await fetch('http://localhost:3001/api/ot/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Success: ${result.success}`);
        console.log(`Message: ${result.message}`);
        if (response.status === 400 && result.message.includes('chưa chấm công ra')) {
            console.log("✅ TEST 2 THÀNH CÔNG: Đã chặn thành công khi chưa check-out!");
        } else {
            console.error("❌ TEST 2 THẤT BẠI!");
        }

        // TEST TRƯỜNG HỢP 3: Đã hoàn thành chấm công (check-in & check-out)
        console.log("\n--- TEST 3: Đã hoàn thành chấm công (check-in & check-out) ---");
        // Cập nhật giờ ra
        await pool.query(
            `UPDATE CHAM_CONG SET gio_ra = '2026-06-25 17:00:00', ghi_chu = 'Check-out test ca chính' 
             WHERE id_cham_cong = 'CC999999'`
        );

        response = await fetch('http://localhost:3001/api/ot/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        result = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Success: ${result.success}`);
        console.log(`Message: ${result.message}`);
        if (response.status === 201 && result.success === true) {
            console.log("✅ TEST 3 THÀNH CÔNG: Cho phép đăng ký tăng ca sau khi hoàn thành chấm công!");
        } else {
            console.error("❌ TEST 3 THẤT BẠI!");
        }

        // Dọn dẹp sau khi test
        await pool.query("DELETE FROM DON_DANG_KY_OT WHERE id_nhan_vien = $1 AND ngay_dang_ky_ot = $2", [employeeId, testDate]);
        await pool.query("DELETE FROM CHAM_CONG WHERE id_nhan_vien = $1 AND gio_vao::date = $2::date", [employeeId, testDate]);
        console.log("\nĐã dọn dẹp dữ liệu test thành công.");

    } catch (error) {
        console.error("Lỗi khi chạy test:", error);
    } finally {
        pool.end();
    }
}

runTest();
