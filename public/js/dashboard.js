/* global Chart, API, formatEur, formatPeriod */

let revenueChart;
let distributionChart;
let allPayslips = [];
let allJobs     = [];
let selectedYear = new Date().getFullYear();

async function init() {
  try {
    [allPayslips, allJobs] = await Promise.all([
      API.payslips.getAll(),
      API.jobs.getAll(),
    ]);

    buildYearTabs();
    render();

    document.getElementById('chart-period').addEventListener('change', () => render());
  } catch (err) {
    console.error('Erreur dashboard:', err);
  }
}

// ── Onglets années ────────────────────────────────────────────────────────────
function buildYearTabs() {
  // Détecter toutes les années présentes dans les fiches
  const years = [...new Set(allPayslips.map(p => p.period_end.substring(0, 4)))]
    .map(Number)
    .sort((a, b) => b - a);

  // Ajouter l'année en cours si absente
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

// ── Rendu global (appelé à chaque changement d'année) ─────────────────────────
function render() {
  const payslips = allPayslips.filter(p => p.period_end.startsWith(String(selectedYear)));
  updateGlobalStats(payslips);
  updateJobCards(payslips);
  buildRevenueChart(payslips);
  buildDistributionChart(payslips);
}

// ── Stats globales ────────────────────────────────────────────────────────────
function updateGlobalStats(payslips) {
  const total = payslips.reduce((s, p) => s + parseFloat(p.net_salary), 0);
  const hours = payslips.reduce((s, p) => s + (parseFloat(p.hours_declared) || 0), 0);

  document.getElementById('stat-total').textContent = formatEur(total);
  document.getElementById('stat-hours').textContent = hours.toFixed(2) + ' h';
  document.getElementById('stat-count').textContent = payslips.length;
}

// ── Cartes jobs ───────────────────────────────────────────────────────────────
function updateJobCards(payslips) {
  const container = document.getElementById('job-cards');
  container.innerHTML = '';

  allJobs.forEach(job => {
    const jobPayslips = payslips.filter(p => p.job_id === job.id);
    const total       = jobPayslips.reduce((s, p) => s + parseFloat(p.net_salary), 0);
    const hours       = jobPayslips.reduce((s, p) => s + (parseFloat(p.hours_declared) || 0), 0);
    const latest      = jobPayslips[0]; // déjà trié par period_end DESC

    const card = document.createElement('a');
    card.href      = `/pages/job.html?id=${job.id}`;
    card.className = 'card';
    card.style.cssText = 'text-decoration:none;color:inherit;cursor:pointer;transition:box-shadow .15s';
    card.onmouseenter = () => card.style.boxShadow = '0 4px 20px rgba(37,99,235,.15)';
    card.onmouseleave = () => card.style.boxShadow = '';

    card.innerHTML = `
      <h3>${job.name}</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${job.employer_name || 'Employeur non défini'}</p>
      ${jobPayslips.length > 0 ? `
        <div class="stat-label">Total ${selectedYear}</div>
        <div class="stat-value">${formatEur(total)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${hours.toFixed(2)} h — ${jobPayslips.length} fiche${jobPayslips.length > 1 ? 's' : ''}</div>
        ${latest ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Dernier : ${formatEur(latest.net_salary)} · ${formatPeriod(latest.period_start, latest.period_end)}</div>` : ''}
      ` : `
        <p style="color:var(--text-muted);font-style:italic;margin-top:8px">Aucune fiche pour ${selectedYear}</p>
      `}
    `;
    container.appendChild(card);
  });
}

// ── Graphique revenus ─────────────────────────────────────────────────────────
function buildRevenueChart(payslips) {
  const mode = document.getElementById('chart-period').value;
  const ctx  = document.getElementById('revenue-chart').getContext('2d');

  let labels, dataA, dataB;

  if (mode === 'monthly') {
    // 12 mois de l'année sélectionnée
    labels = Array.from({ length: 12 }, (_, i) =>
      new Date(selectedYear, i, 1).toLocaleString('fr-BE', { month: 'short' })
    );
    dataA = new Array(12).fill(0);
    dataB = new Array(12).fill(0);

    payslips.forEach(p => {
      const month = parseInt(p.period_end.substring(5, 7)) - 1;
      if (p.job_id === 1) dataA[month] += parseFloat(p.net_salary);
      if (p.job_id === 2) dataB[month] += parseFloat(p.net_salary);
    });
  } else {
    // Par semaine : regrouper par numéro de semaine ISO
    const weekMap = { A: {}, B: {} };
    payslips.forEach(p => {
      const d    = new Date(p.period_end);
      const week = getISOWeek(d);
      const key  = `S${week}`;
      if (p.job_id === 1) weekMap.A[key] = (weekMap.A[key] || 0) + parseFloat(p.net_salary);
      if (p.job_id === 2) weekMap.B[key] = (weekMap.B[key] || 0) + parseFloat(p.net_salary);
    });

    labels = [...new Set([...Object.keys(weekMap.A), ...Object.keys(weekMap.B)])]
      .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    dataA  = labels.map(k => weekMap.A[k] || 0);
    dataB  = labels.map(k => weekMap.B[k] || 0);
  }

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Job A',
          data: dataA,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#2563EB',
        },
        {
          label: 'Job B',
          data: dataB,
          borderColor: '#16A34A',
          backgroundColor: 'rgba(22,163,74,.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#16A34A',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `${v} €` } },
      },
    },
  });
}

// ── Graphique répartition ─────────────────────────────────────────────────────
function buildDistributionChart(payslips) {
  const totalA = payslips.filter(p => p.job_id === 1).reduce((s, p) => s + parseFloat(p.net_salary), 0);
  const totalB = payslips.filter(p => p.job_id === 2).reduce((s, p) => s + parseFloat(p.net_salary), 0);

  const ctx = document.getElementById('distribution-chart').getContext('2d');
  if (distributionChart) distributionChart.destroy();

  distributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Job A', 'Job B'],
      datasets: [{ data: [totalA, totalB], backgroundColor: ['#2563EB', '#16A34A'], borderWidth: 0 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      cutout: '65%',
    },
  });

  const legend = document.getElementById('distribution-legend');
  legend.innerHTML = '';
  [['Job A', totalA, '#2563EB'], ['Job B', totalB, '#16A34A']].forEach(([label, val, color]) => {
    legend.innerHTML += `
      <div style="display:flex;align-items:center;gap:6px;font-size:13px">
        <span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block"></span>
        ${label} — ${formatEur(val)}
      </div>`;
  });
}

// ── Utilitaire : numéro de semaine ISO ────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

init();
