/**
 * Tính khoảng cách Euclid giữa hai vector (mảng số thực)
 * @param {number[]} v1 
 * @param {number[]} v2 
 * @returns {number}
 */
export const euclideanDistance = (v1, v2) => {
    if (!v1 || !v2 || v1.length !== v2.length) return Infinity;
    return Math.sqrt(v1.reduce((sum, val, i) => sum + Math.pow(val - v2[i], 2), 0));
};

/**
 * Tính độ tương đồng (Similarity) dựa trên khoảng cách Euclid
 */
export const calculateSimilarity = (distance) => {
    // MobileFaceNet có khoảng cách từ 0 (giống hệt) đến ~1.4 (khác hoàn toàn)
    // Dùng 1.5 làm mẫu số quy đổi ra % là hợp lý
    return Math.max(0, (1 - distance / 1.5)) * 100;
};

/**
 * Tìm độ tương đồng tốt nhất giữa 1 embedding và danh sách embeddings (3 góc mặt)
 */
export const findBestMatch = (inputEmbedding, storedEmbeddings) => {
    let maxSimilarity = 0;
    let minDistance = Infinity;

    if (!Array.isArray(storedEmbeddings)) return { bestSimilarity: 0, bestDistance: Infinity };

    storedEmbeddings.forEach(storedEmbedding => {
        const distance = euclideanDistance(inputEmbedding, storedEmbedding);

        // SỬA: Gọi hàm calculateSimilarity để đồng nhất logic quy đổi %
        const similarity = calculateSimilarity(distance);

        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            minDistance = distance;
        }
    });

    return {
        bestSimilarity: maxSimilarity,
        bestDistance: minDistance
    };
};
