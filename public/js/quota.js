/* global API, formatPeriod */

async function init() {
  try {
    const q = await API.quota.getCurrent();

    document.getElementById('year-label').textContent       = q.year;
    document.getElementById('quota-hours-used').textContent = `${q.hoursUsed} h`;
    document.getElementById('quota-percent').textContent    = q.percentUsed;
    document.getElementById('quota-remaining').textContent  = q.hoursRemaining;

    // Barre de progression
    const bar = document.getElementById('quota-bar');
    bar.style.width = `${q.percentUsed}%`;
    if (q.percentUsed >= 100) bar.classList.add('danger');
    else if (q.percentUsed >= 80) bar.classList.add('warning');

    // Alerte
    const alertCard = document.getElementById('quota-alert-card');
    const alertDiv  = document.getElementById('quota-alert');
    if (q.isExceeded) {
      alertCard.style.display = 'block';
      alertDiv.className = 'alert alert-error';
      alertDiv.textContent = `⚠️ Tu as dépassé ton quota de 650h ! Les heures supplémentaires sont soumises aux cotisations sociales normales.`;
    } else if (q.percentUsed >= 80) {
      alertCard.style.display = 'block';
      alertDiv.className = 'alert alert-error';
      alertDiv.textContent = `⚠️ Attention : tu as consommé ${q.percentUsed}% de ton quota. Il te reste ${q.hoursRemaining}h.`;
    }

    // Tableau de détail
    const tbody = document.getElementById('quota-detail-tbody');
    if (!q.detail || q.detail.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">Aucune fiche importée pour cette année.</td></tr>';
      return;
    }

    let cumul = 0;
    tbody.innerHTML = q.detail.map(row => {
      cumul += parseFloat(row.hours_declared);
      const cumulRounded = Math.round(cumul * 100) / 100;
      const pct = Math.min(100, Math.round((cumulRounded / 650) * 10) / 10);
      return `
        <tr>
          <td><span class="badge ${row.job_name === 'Job A' ? 'badge-blue' : 'badge-green'}">${row.job_name}</span></td>
          <td>${formatPeriod(row.period_start, row.period_end)}</td>
          <td>${parseFloat(row.hours_declared).toFixed(2)} h</td>
          <td><strong>${cumulRounded} h</strong> <span style="color:var(--text-muted);font-size:12px">(${pct}%)</span></td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
  }
}

init();
