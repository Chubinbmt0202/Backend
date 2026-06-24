import pool from '../config/db.js';

async function run() {
    try {
        console.log("Creating CAU_HINH_TANG_CA table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS CAU_HINH_TANG_CA (
                id_cau_hinh VARCHAR(8) PRIMARY KEY,
                thoi_gian_check_in_truoc INTEGER NOT NULL DEFAULT 30,
                thoi_gian_ot_toi_thieu INTEGER NOT NULL DEFAULT 30,
                ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Inserting default config row...");
        await pool.query(`
            INSERT INTO CAU_HINH_TANG_CA (id_cau_hinh, thoi_gian_check_in_truoc, thoi_gian_ot_toi_thieu)
            VALUES ('OTCF001', 30, 30)
            ON CONFLICT DO NOTHING;
        `);
        console.log("Migration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        pool.end();
    }
}

run();
