/**
 * Fonctions utilitaires partagées entre toutes les pages.
 */

/**
 * Formate un montant en euros.
 * @param {number} amount
 * @returns {string} ex: "1 234,56 €"
 */
function formatEur(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount);
}

/**
 * Formate une date YYYY-MM-DD en DD/MM/YYYY.
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Formate une période start→end.
 * @param {string} start - YYYY-MM-DD
 * @param {string} end   - YYYY-MM-DD
 * @returns {string}
 */
function formatPeriod(start, end) {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

/**
 * Affiche un message d'alerte dans un conteneur.
 * @param {HTMLElement} container
 * @param {string}      message
 * @param {'info'|'success'|'error'} type
 */
function showAlert(container, message, type = 'info') {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.prepend(div);
  setTimeout(() => div.remove(), 5000);
}

/**
 * Récupère un paramètre de l'URL.
 * @param {string} name
 * @returns {string|null}
 */
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
