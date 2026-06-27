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

async function migrate() {
  try {
    await pool.query('ALTER TABLE LOAI_PHEP ADD COLUMN IF NOT EXISTS so_ngay_toi_da_1_thang NUMERIC DEFAULT 0;');
    console.log('Migration success: Added so_ngay_toi_da_1_thang to LOAI_PHEP');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
