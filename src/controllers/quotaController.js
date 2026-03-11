const { pool }        = require('../config/database');
const { calcQuota }   = require('../services/quotaService');

/**
 * GET /api/quota
 * Retourne l'état du quota étudiant 650h pour l'année en cours.
 */
async function getCurrent(req, res, next) {
  try {
    const year = new Date().getFullYear();

    const [rows] = await pool.query(
      `SELECT p.id, p.period_start, p.period_end, p.hours_declared, j.name AS job_name
       FROM payslips p
       JOIN jobs j ON j.id = p.job_id
       WHERE YEAR(p.period_end) = ?
         AND p.hours_declared IS NOT NULL
       ORDER BY p.period_end ASC`,
      [year]
    );

    const totalHours = rows.reduce((sum, r) => sum + parseFloat(r.hours_declared), 0);
    const quota      = calcQuota(totalHours);

    res.json({ year, ...quota, detail: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCurrent };
