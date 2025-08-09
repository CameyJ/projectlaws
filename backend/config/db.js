const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // cierra conexiones inactivas tras 30s
  connectionTimeoutMillis: 10000, // tiempo máx. de espera para conectar
  maxLifetimeSeconds: 60 * 15 // recircula conexiones cada 15 min
});

// Manejo de errores global del pool
pool.on('error', (err) => {
  console.error('Error en conexión del pool PG:', err.message || err);
});

// Función para ejecutar queries con retry simple
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const shutdown = String(err?.message || '').includes('db_termination');
    if (shutdown) {
      console.warn('Reintentando consulta tras db_termination...');
      await new Promise(r => setTimeout(r, 500)); // backoff
      return pool.query(text, params);
    }
    throw err;
  }
}

module.exports = { pool, query };
