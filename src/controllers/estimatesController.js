const { pool } = require('../config/database');

/** GET /api/estimates — toutes les estimations (dashboard) */
async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, j.name AS job_name,
             ROUND(e.hours_worked * e.hourly_rate, 2) AS estimated_salary
      FROM work_estimates e
      JOIN jobs j ON j.id = e.job_id
      ORDER BY e.year DESC, e.month DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
}

/** GET /api/estimates/job/:jobId — estimations d'un job */
async function getByJob(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT *, ROUND(hours_worked * hourly_rate, 2) AS estimated_salary
       FROM work_estimates WHERE job_id = ? ORDER BY year DESC, month DESC`,
      [req.params.jobId]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

/** POST /api/estimates — créer ou mettre à jour (upsert par job+année+mois) */
async function upsert(req, res, next) {
  try {
    const { job_id, year, month, hours_worked, hourly_rate, note } = req.body;
    if (!job_id || !year || !month || !hours_worked || !hourly_rate) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }
    await pool.query(
      `INSERT INTO work_estimates (job_id, year, month, hours_worked, hourly_rate, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         hours_worked = VALUES(hours_worked),
         hourly_rate  = VALUES(hourly_rate),
         note         = VALUES(note)`,
      [job_id, year, month, parseFloat(hours_worked), parseFloat(hourly_rate), note || null]
    );
    const [rows] = await pool.query(
      `SELECT *, ROUND(hours_worked * hourly_rate, 2) AS estimated_salary
       FROM work_estimates WHERE job_id = ? AND year = ? AND month = ?`,
      [job_id, year, month]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

/** DELETE /api/estimates/:id */
async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM work_estimates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { getAll, getByJob, upsert, remove };
