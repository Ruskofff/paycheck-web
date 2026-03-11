/**
 * Middleware de gestion globale des erreurs Express.
 * Toutes les erreurs non gérées atterrissent ici via next(err).
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.url} →`, err.message);

  const status  = err.status  || 500;
  const message = err.message || 'Erreur interne du serveur';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
