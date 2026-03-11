require('dotenv').config();
const mysql = require('mysql2/promise');

// Pool de connexions MySQL — réutilisé par tous les controllers
const pool = mysql.createPool({
  host:        process.env.DB_HOST || '127.0.0.1',
  port:        parseInt(process.env.DB_PORT) || 3306,
  user:        process.env.DB_USER || 'root',
  password:    process.env.DB_PASSWORD,
  database:    process.env.DB_NAME || 'paycheck',
  dateStrings: true, // retourne les dates MySQL comme strings (évite les décalages UTC)
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

/**
 * Teste la connexion à MySQL au démarrage.
 * Appelé depuis app.js une fois le serveur lancé.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connecté avec succès.');
    conn.release();
  } catch (err) {
    console.error('Impossible de se connecter à MySQL :', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
