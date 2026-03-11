const { pool } = require('../config/database');

/**
 * GET /api/jobs
 * Retourne tous les jobs avec la dernière fiche de paie associée.
 */
async function getAll(req, res, next) {
  try {
    const [jobs] = await pool.query(`
      SELECT
        j.id,
        j.name,
        j.employer_name,
        j.hourly_rate,
        p.net_salary    AS latest_net,
        p.period_start  AS latest_period_start,
        p.period_end    AS latest_period_end
      FROM jobs j
      LEFT JOIN payslips p ON p.id = (
        SELECT id FROM payslips
        WHERE job_id = j.id
        ORDER BY period_end DESC
        LIMIT 1
      )
      ORDER BY j.id
    `);
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:id
 * Retourne un job par son ID.
 */
async function getById(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job introuvable.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/jobs/:id
 * Met à jour le nom de l'employeur et/ou le taux horaire d'un job.
 * Body: { employer_name?, hourly_rate? }
 */
async function update(req, res, next) {
  try {
    const { employer_name, hourly_rate } = req.body;
    await pool.query(
      'UPDATE jobs SET employer_name = ?, hourly_rate = ? WHERE id = ?',
      [employer_name ?? null, hourly_rate ?? null, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, update };
