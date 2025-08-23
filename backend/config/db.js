// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,                  // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // cierra conexiones inactivas tras 30s
  connectionTimeoutMillis: 10000,
  // OJO: pg no usa maxLifetimeSeconds; lo dejo comentado por si lo necesitas en otra lib
  // maxLifetimeSeconds: 60 * 15,
});

// Manejo de errores global del pool
pool.on('error', (err) => {
  console.error('Error en conexión del pool PG:', err?.message || err);
});

// Query con retry simple ante :db_termination
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const shutdown = String(err?.message || '').includes('db_termination');
    if (shutdown) {
      console.warn('Reintentando consulta tras db_termination...');
      await new Promise((r) => setTimeout(r, 500));
      return pool.query(text, params);
    }
    throw err;
  }
}

// 👉 ESTA FUNCIÓN ES LA QUE USA evaluationRoutes PARA TRANSACCIONES
function getClient() {
  return pool.connect(); // retorna un client; recuerda hacer client.release()
}

module.exports = { pool, query, getClient };
