/* global API, formatEur, formatDate, formatPeriod, showAlert, getParam */

const jobId = parseInt(getParam('id')) || 1;

// Mettre le lien actif dans la sidebar
document.getElementById(`nav-job-${jobId === 1 ? 'a' : 'b'}`).classList.add('active');

async function init() {
  await loadJob();
  await loadPayslips();
  initUpload();
  initEditModal();
}

// ── Données du job ───────────────────────────────────────────────────────────
async function loadJob() {
  try {
    const job = await API.jobs.getById(jobId);
    document.title             = `PayCheck — ${job.name}`;
    document.getElementById('job-title').textContent    = job.name;
    document.getElementById('job-employer').textContent = job.employer_name || 'Employeur non défini';
    document.getElementById('edit-employer').value      = job.employer_name || '';
    document.getElementById('edit-rate').value          = job.hourly_rate   || '';
  } catch (err) {
    showAlert(document.getElementById('alerts'), err.message, 'error');
  }
}

// ── Liste des fiches de paie ─────────────────────────────────────────────────
async function loadPayslips() {
  const tbody = document.getElementById('payslips-tbody');
  try {
    const payslips = await API.payslips.getByJob(jobId);

    // Stats annuelles
    const year    = new Date().getFullYear();
    const thisYear = payslips.filter(p => p.period_end.startsWith(year.toString()));
    document.getElementById('stat-year-total').textContent =
      formatEur(thisYear.reduce((s, p) => s + parseFloat(p.net_salary), 0));
    document.getElementById('stat-year-hours').textContent =
      thisYear.reduce((s, p) => s + (parseFloat(p.hours_declared) || 0), 0).toFixed(2) + ' h';

    // Dernier net
    const latest = payslips[0];
    document.getElementById('stat-last-net').textContent = latest ? formatEur(latest.net_salary) : '—';

    if (payslips.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucune fiche importée pour ce job.</td></tr>';
      return;
    }

    tbody.innerHTML = payslips.map(p => {
      const declared  = p.hours_declared != null ? parseFloat(p.hours_declared) : null;
      const pointed   = parseFloat(p.hours_timesheet) || 0;
      const delta     = declared != null ? Math.round((pointed - declared) * 100) / 100 : null;

      let deltaBadge = '—';
      if (delta !== null) {
        if (pointed === 0) {
          // Aucun pointage saisi — pas de couleur pour éviter la confusion
          deltaBadge = `<span style="color:var(--text-muted);font-size:12px">Non saisi</span>`;
        } else if (Math.abs(delta) < 0.01) {
          deltaBadge = `<span class="badge badge-green">✓ OK</span>`;
        } else if (delta > 0) {
          // Tu as pointé plus que sur la fiche → sous-payé → erreur en ta défaveur
          deltaBadge = `<span class="badge badge-red" title="Tu as travaillé ${delta}h de plus que déclaré sur la fiche">+${delta} h ⚠️</span>`;
        } else {
          // Tu as pointé moins que sur la fiche → sur-payé → erreur en ta faveur
          deltaBadge = `<span class="badge badge-orange" title="La fiche déclare ${Math.abs(delta)}h de plus que tes pointages">${delta} h</span>`;
        }
      }

      return `
        <tr>
          <td>${formatPeriod(p.period_start, p.period_end)}</td>
          <td>${declared != null ? declared + ' h' : '—'}</td>
          <td>${pointed > 0 ? pointed + ' h' : '<span style="color:var(--text-muted);font-style:italic">Non saisi</span>'}</td>
          <td>${deltaBadge}</td>
          <td>${p.hourly_rate != null ? p.hourly_rate + ' €/h' : '—'}</td>
          <td>${p.travel_allowance != null ? formatEur(p.travel_allowance) : '—'}</td>
          <td><strong>${formatEur(p.net_salary)}</strong></td>
          <td>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:12px"
              onclick="deletePayslip(${p.id})">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="alert alert-error">${err.message}</td></tr>`;
  }
}

// ── Suppression fiche ────────────────────────────────────────────────────────
async function deletePayslip(id) {
  if (!confirm('Supprimer cette fiche de paie ?')) return;
  try {
    await API.payslips.remove(id);
    await loadPayslips();
  } catch (err) {
    showAlert(document.getElementById('alerts'), err.message, 'error');
  }
}

// ── Upload PDF ───────────────────────────────────────────────────────────────
function initUpload() {
  const zone  = document.getElementById('upload-zone');
  const input = document.getElementById('pdf-input');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => handleFiles(input.files));
}

async function handleFiles(files) {
  if (!files || files.length === 0) return;

  const resultsDiv = document.getElementById('import-results');
  resultsDiv.innerHTML = '<div class="alert alert-info">Import en cours…</div>';

  const formData = new FormData();
  formData.append('job_id', jobId);
  Array.from(files).forEach(f => formData.append('pdfs', f));

  try {
    const { results } = await API.payslips.import(formData);
    let html = '';
    results.forEach(r => {
      if (r.success) {
        html += `<div class="alert alert-success">✅ ${r.file} — Net: ${formatEur(r.data.netSalary)}</div>`;
      } else {
        html += `<div class="alert alert-error">❌ ${r.file} — ${r.error}</div>`;
      }
    });
    resultsDiv.innerHTML = html;
    await loadPayslips();
  } catch (err) {
    resultsDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }

  // Reset input
  document.getElementById('pdf-input').value = '';
}

// ── Modal modifier job ───────────────────────────────────────────────────────
function initEditModal() {
  const modal  = document.getElementById('modal-edit');
  document.getElementById('btn-edit-job').onclick    = () => modal.classList.add('open');
  document.getElementById('btn-cancel-edit').onclick = () => modal.classList.remove('open');

  document.getElementById('btn-save-edit').onclick = async () => {
    try {
      await API.jobs.update(jobId, {
        employer_name: document.getElementById('edit-employer').value || null,
        hourly_rate:   parseFloat(document.getElementById('edit-rate').value) || null,
      });
      modal.classList.remove('open');
      await loadJob();
    } catch (err) {
      showAlert(document.getElementById('alerts'), err.message, 'error');
    }
  };

  // Fermer en cliquant hors du modal
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

init();
