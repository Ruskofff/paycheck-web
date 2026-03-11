const { pool } = require('../config/database');

/**
 * GET /api/timesheet/job/:jobId
 * Retourne toutes les entrées de journal d'un job.
 */
async function getByJob(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM timesheet_entries WHERE job_id = ? ORDER BY work_date DESC',
      [req.params.jobId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/timesheet
 * Crée une entrée de journal.
 * Body: { job_id, work_date, time_start, time_end, break_minutes?, note? }
 * hours_worked est calculé automatiquement : (time_end - time_start) - pause
 */
async function create(req, res, next) {
  try {
    const { job_id, work_date, time_start, time_end, break_minutes, note } = req.body;

    if (!job_id || !work_date || !time_start || !time_end) {
      return res.status(400).json({ error: 'job_id, work_date, time_start et time_end sont requis.' });
    }

    // Calcul des heures travaillées
    const [sh, sm] = time_start.split(':').map(Number);
    const [eh, em] = time_end.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm) - (parseInt(break_minutes) || 0);

    if (totalMinutes <= 0) {
      return res.status(400).json({ error: 'La durée calculée est invalide. Vérifiez les heures et la pause.' });
    }

    const hours_worked = Math.round((totalMinutes / 60) * 100) / 100;

    const [result] = await pool.query(
      `INSERT INTO timesheet_entries
        (job_id, work_date, time_start, time_end, break_minutes, hours_worked, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [job_id, work_date, time_start, time_end, parseInt(break_minutes) || 0, hours_worked, note ?? null]
    );

    const [rows] = await pool.query('SELECT * FROM timesheet_entries WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/timesheet/:id
 * Supprime une entrée de journal.
 */
async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM timesheet_entries WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getByJob, create, remove };
