import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api/shifts`;

const testShifts = async () => {
    try {
        console.log("=== BẮT ĐẦU KIỂM TRA SHIFT API ===");

        // 1. Thêm ca làm mới
        console.log("\n1. Đang thêm ca làm mới...");
        const newShift = {
            shift_name: "Ca Tăng Ca Kiểm Thử",
            start_time: "18:00",
            end_time: "22:00",
            late_tolerance_mins: 5,
            coefficient: 1.5,
            has_lunch_break: false,
            lunch_start_time: null,
            lunch_end_time: null
        };

        const addResp = await fetch(`${BASE_URL}/addShift`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newShift)
        });
        const addData = await addResp.json();
        console.log("Kết quả thêm ca:", addData.message);
        const createdShift = addData.data;
        console.log("ID ca mới:", createdShift.id);

        // 2. Lấy danh sách ca làm
        console.log("\n2. Đang lấy danh sách ca làm...");
        const getResp = await fetch(`${BASE_URL}/getAllShifts`);
        const getData = await getResp.json();
        console.log("Số lượng ca làm hiện có:", getData.data.length);
        
        // 3. Cập nhật ca làm
        console.log("\n3. Đang cập nhật ca làm vừa tạo...");
        const updatedData = {
            ...newShift,
            shift_name: "Ca Tăng Ca Đã Cập Nhật",
            late_tolerance_mins: 10
        };
        const updateResp = await fetch(`${BASE_URL}/updateShift/${createdShift.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        const updateResult = await updateResp.json();
        console.log("Kết quả cập nhật:", updateResult.message);
        console.log("Dữ liệu mới:", updateResult.data.shift_name);

        console.log("\n=== KIỂM TRA HOÀN TẤT THÀNH CÔNG ===");
    } catch (error) {
        console.error("Lỗi khi kiểm tra API:", error.message);
    }
};

testShifts();

