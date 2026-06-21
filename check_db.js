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
    const updateRes = await pool.query(`
      UPDATE CA_LAM_VIEC 
      SET gio_vao = '2026-01-01 10:00:00', gio_ra = '2026-01-01 18:00:00', mo_vao_truoc = 60 
      WHERE id_ca_lam_viec = 'CA535252'
    `);
    console.log("Updated rows:", updateRes.rowCount);

    const caRes = await pool.query("SELECT * FROM CA_LAM_VIEC WHERE id_ca_lam_viec = 'CA535252'");
    console.log("Ca lam viec data:", caRes.rows);
  } finally {
    await pool.end();
  }
}

run();
