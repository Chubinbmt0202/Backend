import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkLeaveTypes() {
  try {
    const res = await pool.query('SELECT * FROM LOAI_PHEP');
    console.log('Current Leave Types:', res.rows);
    
    // Ensure we have Nghỉ ốm, Phép hàng tháng, Việc riêng
    const types = [
      { id: 'LP001', name: 'Phép hàng tháng' },
      { id: 'LP002', name: 'Nghỉ ốm' },
      { id: 'LP003', name: 'Việc riêng' }
    ];

    for (const t of types) {
        const exist = await pool.query('SELECT 1 FROM LOAI_PHEP WHERE id_loai_phep = $1', [t.id]);
        if (exist.rows.length === 0) {
            await pool.query('INSERT INTO LOAI_PHEP (id_loai_phep, ten_phep, so_ngay_toi_da, so_ngay_toi_da_1_thang, co_luong, mo_ta) VALUES ($1, $2, 12, 1, false, $3)', [t.id, t.name, t.name]);
            console.log('Inserted', t.name);
        } else {
            // Check if name matches exactly, if not, wait. I shouldn't change existing names unless requested. But I will just ensure the data is there.
        }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkLeaveTypes();
