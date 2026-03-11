require('dotenv').config();

const express = require('express');
const path    = require('path');

const jobsRouter      = require('./src/routes/jobs');
const payslipsRouter  = require('./src/routes/payslips');
const timesheetRouter = require('./src/routes/timesheet');
const quotaRouter     = require('./src/routes/quota');
const errorHandler    = require('./src/middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes API ──────────────────────────────────────────────────────────────
app.use('/api/jobs',      jobsRouter);
app.use('/api/payslips',  payslipsRouter);
app.use('/api/timesheet', timesheetRouter);
app.use('/api/quota',     quotaRouter);

// Route principale → dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

// ── Gestion des erreurs (doit être en dernier) ──────────────────────────────
app.use(errorHandler);

// ── Démarrage ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`PayCheck Web démarré sur http://localhost:${PORT}`);
});
