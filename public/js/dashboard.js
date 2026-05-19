/* global Chart, API, formatEur, formatPeriod, loadNav */

let revenueChart;
let distributionChart;
let allPayslips = [];
let allJobs     = [];
let selectedYear = new Date().getFullYear();

const JOB_COLORS = [
  { border: '#2563EB', bg: 'rgba(37,99,235,.1)' },
  { border: '#16A34A', bg: 'rgba(22,163,74,.1)' },
  { border: '#EA580C', bg: 'rgba(234,88,12,.1)' },
  { border: '#9333EA', bg: 'rgba(147,51,234,.1)' },
  { border: '#E11D48', bg: 'rgba(225,29,72,.1)' },
  { border: '#0891B2', bg: 'rgba(8,145,178,.1)' },
];

function jobColor(index) {
  return JOB_COLORS[index % JOB_COLORS.length];
}

async function init() {
  try {
    [allPayslips, allJobs] = await Promise.all([
      API.payslips.getAll(),
      API.jobs.getAll(),
    ]);

    loadNav();
    buildYearTabs();
    render();

    document.getElementById('chart-period').addEventListener('change', () => render());
  } catch (err) {
    console.error('Erreur dashboard:', err);
  }
}

// ── Onglets années ────────────────────────────────────────────────────────────
function buildYearTabs() {
  const years = [...new Set(allPayslips.map(p => p.period_end.substring(0, 4)))]
    .map(Number)
    .sort((a, b) => b - a);

  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const container = document.getElementById('year-tabs');
  container.innerHTML = '';

  years.forEach(year => {
    const btn = document.createElement('button');
    btn.textContent = year;
    btn.className   = year === selectedYear ? 'btn btn-primary' : 'btn btn-ghost';
    btn.style.cssText = 'padding:6px 14px;font-size:13px';
    btn.addEventListener('click', () => {
      selectedYear = year;
      container.querySelectorAll('button').forEach(b => b.className = 'btn btn-ghost');
      btn.className = 'btn btn-primary';
      render();
    });
    container.appendChild(btn);
  });
}

// ── Rendu global ──────────────────────────────────────────────────────────────
function render() {
  const payslips = allPayslips.filter(p => p.period_end.startsWith(String(selectedYear)));
  updateGlobalStats(payslips);
  updateJobCards(payslips);
  buildRevenueChart(payslips);
  buildDistributionChart(payslips);
  buildDetailTable(payslips);
}

// ── Montant effectif : actual_received si renseigné, sinon net_salary ─────────
function effective(p) {
  return p.actual_received != null ? parseFloat(p.actual_received) : parseFloat(p.net_salary);
}

// ── Stats globales ────────────────────────────────────────────────────────────
function updateGlobalStats(payslips) {
  const total = payslips.reduce((s, p) => s + effective(p), 0);
  const hours = payslips.reduce((s, p) => s + (parseFloat(p.hours_declared) || 0), 0);

  document.getElementById('stat-total').textContent = formatEur(total);
  document.getElementById('stat-hours').textContent = hours.toFixed(2) + ' h';
  document.getElementById('stat-count').textContent = payslips.length;
}

// ── Cartes jobs ───────────────────────────────────────────────────────────────
function updateJobCards(payslips) {
  const container = document.getElementById('job-cards');
  container.innerHTML = '';

  allJobs.forEach((job, idx) => {
    const color       = jobColor(idx).border;
    const jobPayslips = payslips.filter(p => p.job_id === job.id);
    const total       = jobPayslips.reduce((s, p) => s + effective(p), 0);
    const hours       = jobPayslips.reduce((s, p) => s + (parseFloat(p.hours_declared) || 0), 0);
    const latest      = jobPayslips[0];

    const card = document.createElement('a');
    card.href      = `/pages/job.html?id=${job.id}`;
    card.className = 'card';
    card.style.cssText = 'text-decoration:none;color:inherit;cursor:pointer;transition:box-shadow .15s;border-top:3px solid ' + color;
    card.onmouseenter = () => card.style.boxShadow = '0 4px 20px rgba(37,99,235,.15)';
    card.onmouseleave = () => card.style.boxShadow = '';

    card.innerHTML = `
      <h3 style="color:${color}">${job.name}</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${job.employer_name || 'Employeur non défini'}</p>
      ${jobPayslips.length > 0 ? `
        <div class="stat-label">Total ${selectedYear}</div>
        <div class="stat-value" style="color:${color}">${formatEur(total)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${hours.toFixed(2)} h — ${jobPayslips.length} fiche${jobPayslips.length > 1 ? 's' : ''}</div>
        ${latest ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Dernier : ${formatEur(effective(latest))} · ${formatPeriod(latest.period_start, latest.period_end)}</div>` : ''}
      ` : `
        <p style="color:var(--text-muted);font-style:italic;margin-top:8px">Aucune fiche pour ${selectedYear}</p>
      `}
    `;
    container.appendChild(card);
  });
}

// ── Graphique revenus (dynamique, tous jobs) ──────────────────────────────────
function buildRevenueChart(payslips) {
  const mode = document.getElementById('chart-period').value;
  const ctx  = document.getElementById('revenue-chart').getContext('2d');

  let labels;
  let datasets;

  if (mode === 'monthly') {
    labels = Array.from({ length: 12 }, (_, i) =>
      new Date(selectedYear, i, 1).toLocaleString('fr-BE', { month: 'short' })
    );

    datasets = allJobs.map((job, idx) => {
      const color = jobColor(idx);
      const data  = new Array(12).fill(0);
      payslips.filter(p => p.job_id === job.id).forEach(p => {
        const month = parseInt(p.period_end.substring(5, 7)) - 1;
        data[month] += effective(p);
      });
      return {
        label: job.name,
        data,
        borderColor: color.border,
        backgroundColor: color.bg,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: color.border,
      };
    });
  } else {
    const weekMaps = allJobs.map(() => ({}));
    payslips.forEach(p => {
      const jobIdx = allJobs.findIndex(j => j.id === p.job_id);
      if (jobIdx === -1) return;
      const week = getISOWeek(new Date(p.period_end));
      const key  = `S${week}`;
      weekMaps[jobIdx][key] = (weekMaps[jobIdx][key] || 0) + effective(p);
    });

    const allKeys = [...new Set(weekMaps.flatMap(m => Object.keys(m)))]
      .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    labels = allKeys;

    datasets = allJobs.map((job, idx) => {
      const color = jobColor(idx);
      return {
        label: job.name,
        data: allKeys.map(k => weekMaps[idx][k] || 0),
        borderColor: color.border,
        backgroundColor: color.bg,
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: color.border,
      };
    });
  }

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `${v} €` } },
      },
    },
  });
}

// ── Graphique répartition (dynamique, tous jobs) ──────────────────────────────
function buildDistributionChart(payslips) {
  const totals = allJobs.map(job =>
    payslips.filter(p => p.job_id === job.id).reduce((s, p) => s + effective(p), 0)
  );

  const ctx = document.getElementById('distribution-chart').getContext('2d');
  if (distributionChart) distributionChart.destroy();

  distributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: allJobs.map(j => j.name),
      datasets: [{
        data: totals,
        backgroundColor: allJobs.map((_, idx) => jobColor(idx).border),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      cutout: '65%',
    },
  });

  const legend = document.getElementById('distribution-legend');
  legend.innerHTML = '';
  allJobs.forEach((job, idx) => {
    const color = jobColor(idx).border;
    legend.innerHTML += `
      <div style="display:flex;align-items:center;gap:6px;font-size:13px">
        <span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block"></span>
        ${job.name} — ${formatEur(totals[idx])}
      </div>`;
  });
}

// ── Tableau de détail mensuel par job ─────────────────────────────────────────
function buildDetailTable(payslips) {
  const tbody = document.getElementById('detail-tbody');
  const thead = document.getElementById('detail-thead');
  if (!tbody || !thead) return;

  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  // En-têtes : Mois + un colonne par job + Total
  thead.innerHTML = `
    <tr>
      <th>Mois</th>
      ${allJobs.map(j => `<th style="text-align:right">${j.name}</th>`).join('')}
      <th style="text-align:right">Total</th>
    </tr>`;

  // Construire une matrice [mois][jobIdx] = montant
  const matrix = Array.from({ length: 12 }, () => allJobs.map(() => 0));
  payslips.forEach(p => {
    const month  = parseInt(p.period_end.substring(5, 7)) - 1;
    const jobIdx = allJobs.findIndex(j => j.id === p.job_id);
    if (jobIdx !== -1) matrix[month][jobIdx] += effective(p);
  });

  // Totaux par colonne
  const colTotals = allJobs.map((_, idx) => matrix.reduce((s, row) => s + row[idx], 0));
  const grandTotal = colTotals.reduce((s, v) => s + v, 0);

  // Lignes mensuelles (uniquement les mois avec au moins 1 fiche)
  tbody.innerHTML = '';
  matrix.forEach((row, monthIdx) => {
    const rowTotal = row.reduce((s, v) => s + v, 0);
    if (rowTotal === 0) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:500">${MONTHS[monthIdx]}</td>
      ${row.map((val, idx) => `
        <td style="text-align:right;color:${val > 0 ? jobColor(idx).border : 'var(--text-muted)'}">
          ${val > 0 ? formatEur(val) : '—'}
        </td>`).join('')}
      <td style="text-align:right;font-weight:600">${formatEur(rowTotal)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Ligne de totaux
  const tfootRow = document.getElementById('detail-tfoot-row');
  if (tfootRow) {
    tfootRow.innerHTML = `
      <td style="font-weight:700">Total ${selectedYear}</td>
      ${colTotals.map((val, idx) => `
        <td style="text-align:right;font-weight:700;color:${jobColor(idx).border}">
          ${formatEur(val)}
        </td>`).join('')}
      <td style="text-align:right;font-weight:700;font-size:15px;color:var(--primary)">${formatEur(grandTotal)}</td>
    `;
  }
}

// ── Utilitaire : numéro de semaine ISO ────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

init();
