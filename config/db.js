import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
    connectionString
        ? {
            connectionString,
            ssl: {
                rejectUnauthorized: false, // Required for Supabase and many managed databases
            },
        }
        : {
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        }
);

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Lỗi kết nối database:', err.stack);
    }
    console.log('Đã kết nối thành công với PostgreSQL hshsh!');
    if (release) release();
});

export default pool;