import supabase from '../config/supabaseClient.js';

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn một file đính kèm.' });
        }

        const file = req.file;
        const timestamp = Date.now();
        // Tạo một folder ngẫu nhiên hoặc theo ngày để tránh trùng tên
        const fileName = `uploads/${timestamp}_${file.originalname.replace(/\s+/g, '_')}`;

        // Upload file sử dụng buffer
        const { data, error } = await supabase.storage
            .from('uploads') // Tên bucket trên Supabase (Bạn cần tạo bucket này trước trên dashboard)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            throw error;
        }

        // Lấy public URL của ảnh vừa tải lên để trả về cho mobile
        const { data: publicUrlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(fileName);

        res.status(200).json({
            success: true,
            message: 'Tải lên thành công!',
            data: {
                url: publicUrlData.publicUrl,
                path: fileName
            }
        });

    } catch (error) {
        console.error('Lỗi khi tải file lên Supabase:', error.message);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải file lên.' });
    }
};
