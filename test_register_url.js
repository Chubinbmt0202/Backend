const fetchImagesAndRegister = async () => {
    const urls = [
        "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/biden.jpg",
        "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/obama.jpg",
        "https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/obama2.jpg"
    ];

    try {
        console.log("=== Đang gọi API /testRegister ===");
        const response = await fetch('http://localhost:3001/api/attendance/testRegister', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls, userId: 1 })
        });

        const result = await response.json();
        console.log("Kết quả API:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Lỗi khi test API:", error.message);
    }
};

fetchImagesAndRegister();
