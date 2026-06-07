import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Mindcheck',
    password: 'trunganh',
    port: 5432,
});

async function run() {
    try {
        const res = await pool.query('SELECT * FROM LOAI_PHEP');
        console.log("Current types:", res.rows);
        
        console.log("Deleting existing DON_XIN_NGHI and LOAI_PHEP to insert new ones...");
        await pool.query('DELETE FROM DON_XIN_NGHI');
        await pool.query('DELETE FROM LOAI_PHEP');
        
        await pool.query(`
            INSERT INTO LOAI_PHEP (id_loai_phep, ten_phep, so_ngay_toi_da, co_luong, mo_ta) VALUES
            ('LP001', 'Phép hàng tháng', 12, TRUE, 'Nghỉ phép theo quy định (1 ngày/tháng)'),
            ('LP002', 'Nghỉ ốm', 30, FALSE, 'Nghỉ do đau ốm (cần minh chứng)'),
            ('LP003', 'Việc riêng', 5, FALSE, 'Nghỉ việc riêng cá nhân')
        `);
        console.log("Successfully inserted 3 leave types.");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
