const QUOTA_LIMIT = 650; // heures annuelles max pour étudiant belge

/**
 * Calcule l'état du quota étudiant.
 * @param {number} hoursUsed - Total d'heures déclarées sur l'année en cours
 * @returns {{ hoursUsed, hoursRemaining, percentUsed, limit, isExceeded }}
 */
function calcQuota(hoursUsed) {
  const hoursRemaining = Math.max(0, QUOTA_LIMIT - hoursUsed);
  const percentUsed    = Math.min(100, (hoursUsed / QUOTA_LIMIT) * 100);
  const isExceeded     = hoursUsed > QUOTA_LIMIT;

  return {
    limit:          QUOTA_LIMIT,
    hoursUsed:      Math.round(hoursUsed * 100) / 100,
    hoursRemaining: Math.round(hoursRemaining * 100) / 100,
    percentUsed:    Math.round(percentUsed * 10) / 10,
    isExceeded,
  };
}

module.exports = { calcQuota, QUOTA_LIMIT };
