const fs             = require('fs');
const { pool }       = require('../config/database');
const { parsePdf }   = require('../services/pdfParser');

/**
 * GET /api/payslips
 * Retourne toutes les fiches de paie, toutes années confondues.
 */
async function getAll(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, j.name AS job_name
      FROM payslips p
      JOIN jobs j ON j.id = p.job_id
      ORDER BY p.period_end DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/payslips/job/:jobId
 * Retourne toutes les fiches d'un job avec réconciliation des heures pointées.
 * Pour chaque fiche, on calcule la somme des heures du journal sur la même période.
 */
async function getByJob(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.*,
         COALESCE((
           SELECT SUM(t.hours_worked)
           FROM timesheet_entries t
           WHERE t.job_id = p.job_id
             AND t.work_date BETWEEN p.period_start AND p.period_end
         ), 0) AS hours_timesheet
       FROM payslips p
       WHERE p.job_id = ?
       ORDER BY p.period_end DESC`,
      [req.params.jobId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payslips/import
 * Importe un ou plusieurs PDFs et les insère en base.
 * Body (multipart): pdfs[] (fichiers), job_id (int)
 */
async function importPdfs(req, res, next) {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier reçu.' });
  }

  const jobId = parseInt(req.body.job_id);
  if (!jobId) {
    return res.status(400).json({ error: 'job_id manquant.' });
  }

  const results = [];

  for (const file of files) {
    try {
      const parsed = await parsePdf(file.path, file.originalname);

      // Vérification des champs obligatoires
      if (!parsed.periodStart || !parsed.periodEnd || parsed.netSalary == null) {
        results.push({ file: file.originalname, success: false, error: 'Données insuffisantes dans le PDF.' });
        continue;
      }

      await pool.query(
        `INSERT INTO payslips
          (job_id, pdf_filename, period_start, period_end, hours_declared, hourly_rate, net_salary, travel_allowance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobId,
          parsed.pdfFilename,
          parsed.periodStart,
          parsed.periodEnd,
          parsed.hoursDeclared   ?? null,
          parsed.hourlyRate      ?? null,
          parsed.netSalary,
          parsed.travelAllowance ?? null,
        ]
      );

      results.push({ file: file.originalname, success: true, data: parsed });
    } catch (err) {
      results.push({ file: file.originalname, success: false, error: err.message });
    } finally {
      // Supprimer le fichier temporaire dans tous les cas
      fs.unlink(file.path, () => {});
    }
  }

  res.json({ results });
}

/**
 * POST /api/payslips/manual
 * Crée une entrée manuelle (Mission annexe / Adventure Valley) sans PDF.
 * Body: { job_id, period_start, period_end, hours_declared, hourly_rate, note?, actual_received? }
 */
async function createManual(req, res, next) {
  try {
    const { job_id, period_start, period_end, hours_declared, hourly_rate, note, actual_received } = req.body;

    if (!job_id || !period_start || !period_end || !hours_declared || !hourly_rate) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    const net_salary      = parseFloat(hours_declared) * parseFloat(hourly_rate);
    const actualReceived  = actual_received != null && actual_received !== '' ? parseFloat(actual_received) : null;

    await pool.query(
      `INSERT INTO payslips (job_id, pdf_filename, period_start, period_end, hours_declared, hourly_rate, net_salary, actual_received)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [job_id, note || 'Saisie manuelle', period_start, period_end,
       parseFloat(hours_declared), parseFloat(hourly_rate), net_salary, actualReceived]
    );

    res.json({ success: true, net_salary, actual_received: actualReceived });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/payslips/:id
 * Met à jour le montant réellement reçu sur le compte bancaire.
 * Body: { actual_received }
 */
async function patch(req, res, next) {
  try {
    const { actual_received } = req.body;
    const actualReceived = actual_received != null && actual_received !== '' ? parseFloat(actual_received) : null;

    await pool.query(
      'UPDATE payslips SET actual_received = ? WHERE id = ?',
      [actualReceived, req.params.id]
    );
    res.json({ success: true, actual_received: actualReceived });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/payslips/:id
 * Supprime une fiche de paie.
 */
async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM payslips WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getByJob, importPdfs, createManual, patch, remove };
