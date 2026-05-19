/* global API, formatEur, formatDate, formatPeriod, showAlert, getParam, loadNav */

const jobId = parseInt(getParam('id')) || 1;

let isManualJob = false;

async function init() {
  loadNav(jobId);

  const job = await loadJob();
  isManualJob = !!job.is_manual;

  if (isManualJob) {
    document.getElementById('section-pdf').style.display    = 'none';
    document.getElementById('section-manual').style.display = '';
    initManualForm();
  } else {
    initUpload();
  }

  await loadPayslips();
  initEditModal();
}

// ── Données du job ───────────────────────────────────────────────────────────
async function loadJob() {
  try {
    const job = await API.jobs.getById(jobId);
    document.title             = `PayCheck — ${job.name}`;
    document.getElementById('job-title').textContent    = job.name;
    document.getElementById('job-employer').textContent = job.employer_name || 'Employeur non défini';
    document.getElementById('edit-name').value          = job.name          || '';
    document.getElementById('edit-employer').value      = job.employer_name || '';
    document.getElementById('edit-rate').value          = job.hourly_rate   || '';
    return job;
  } catch (err) {
    showAlert(document.getElementById('alerts'), err.message, 'error');
    return {};
  }
}

// ── Liste des fiches de paie ─────────────────────────────────────────────────
function effectiveAmount(p) {
  return p.actual_received != null ? parseFloat(p.actual_received) : parseFloat(p.net_salary);
}

async function loadPayslips() {
  const tbody = document.getElementById('payslips-tbody');
  try {
    const payslips = await API.payslips.getByJob(jobId);

    const year    = new Date().getFullYear();
    const thisYear = payslips.filter(p => p.period_end.startsWith(year.toString()));
    document.getElementById('stat-year-total').textContent =
      formatEur(thisYear.reduce((s, p) => s + effectiveAmount(p), 0));
    document.getElementById('stat-year-hours').textContent =
      thisYear.reduce((s, p) => s + (parseFloat(p.hours_declared) || 0), 0).toFixed(2) + ' h';

    const latest = payslips[0];
    document.getElementById('stat-last-net').textContent = latest ? formatEur(effectiveAmount(latest)) : '—';

    document.querySelectorAll('.col-timesheet').forEach(el => {
      el.style.display = isManualJob ? 'none' : '';
    });
    document.querySelectorAll('.col-travel').forEach(el => {
      el.style.display = isManualJob ? 'none' : '';
    });
    document.querySelectorAll('.col-manual-date').forEach(el => {
      el.style.display = isManualJob ? '' : 'none';
    });
    document.querySelectorAll('.col-actual').forEach(el => {
      el.style.display = isManualJob ? '' : 'none';
    });
    document.getElementById('th-period').textContent = isManualJob ? 'Mission' : 'Période';

    if (payslips.length === 0) {
      const cols = isManualJob ? 5 : 8;
      tbody.innerHTML = `<tr><td colspan="${cols}" class="empty">Aucune fiche de paie officielle pour ce job.</td></tr>`;
      return;
    }

    tbody.innerHTML = payslips.map(p => {
      const declared = p.hours_declared != null ? parseFloat(p.hours_declared) : null;
      const pointed  = parseFloat(p.hours_timesheet) || 0;
      const delta    = declared != null ? Math.round((pointed - declared) * 100) / 100 : null;

      let deltaBadge = '—';
      if (delta !== null) {
        if (pointed === 0) {
          deltaBadge = `<span style="color:var(--text-muted);font-size:12px">Non saisi</span>`;
        } else if (Math.abs(delta) < 0.01) {
          deltaBadge = `<span class="badge badge-green">✓ OK</span>`;
        } else if (delta > 0) {
          deltaBadge = `<span class="badge badge-red" title="Tu as travaillé ${delta}h de plus que déclaré">+${delta} h ⚠️</span>`;
        } else {
          deltaBadge = `<span class="badge badge-orange" title="La fiche déclare ${Math.abs(delta)}h de plus que tes pointages">${delta} h</span>`;
        }
      }

      const timesheetCols = isManualJob ? '' : `
        <td class="col-timesheet">${pointed > 0 ? pointed + ' h' : '<span style="color:var(--text-muted);font-style:italic">Non saisi</span>'}</td>
        <td class="col-timesheet">${deltaBadge}</td>`;
      const travelCol = isManualJob ? '' :
        `<td class="col-travel">${p.travel_allowance != null ? formatEur(p.travel_allowance) : '—'}</td>`;

      const actualReceivedDisplay = p.actual_received != null
        ? `<strong style="color:var(--primary)">${formatEur(p.actual_received)}</strong>`
        : `<span style="color:var(--text-muted);font-style:italic">Non renseigné</span>`;
      const actualCol = isManualJob
        ? `<td class="col-actual">
             ${actualReceivedDisplay}
             <button class="btn btn-ghost" style="padding:2px 6px;font-size:11px;margin-left:4px"
               onclick="editActualReceived(${p.id}, ${p.actual_received ?? 'null'})" title="Modifier le montant reçu">✏️</button>
           </td>`
        : '';

      const firstCell = isManualJob
        ? `<td>${p.pdf_filename}</td>`
        : `<td>${formatPeriod(p.period_start, p.period_end)}</td>`;
      const dateCell = isManualJob
        ? `<td class="col-manual-date">${formatDate(p.period_start)}</td>`
        : '';

      return `
        <tr>
          ${firstCell}
          ${dateCell}
          <td>${declared != null ? declared + ' h' : '—'}</td>
          ${timesheetCols}
          <td>${p.hourly_rate != null ? p.hourly_rate + ' €/h' : '—'}</td>
          ${travelCol}
          <td><strong>${formatEur(p.net_salary)}</strong></td>
          ${actualCol}
          <td>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:12px"
              onclick="deletePayslip(${p.id})">🗑️</button>
          </td>
        </tr>`;
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

// ── Édition montant réel reçu ─────────────────────────────────────────────────
async function editActualReceived(id, current) {
  const currentStr = current != null ? String(current) : '';
  const input = prompt(
    'Montant réellement versé sur le compte (€)\n(Laisser vide pour effacer)',
    currentStr
  );
  if (input === null) return; // annulé
  const value = input.trim() === '' ? null : parseFloat(input.replace(',', '.'));
  if (value !== null && isNaN(value)) {
    alert('Montant invalide.');
    return;
  }
  try {
    await API.payslips.updateReceived(id, value);
    await loadPayslips();
  } catch (err) {
    showAlert(document.getElementById('alerts'), err.message, 'error');
  }
}

// ── Saisie manuelle (Mission annexe + Adventure Valley Durbuy) ───────────────
function initManualForm() {
  // Adapter les labels selon le job
  if (jobId === 2) {
    document.getElementById('manual-section-title').textContent  = 'Ajouter un mois travaillé';
    document.getElementById('label-manual-title').textContent    = 'Période';
    document.getElementById('label-manual-date').textContent     = 'Date de paiement';
    document.getElementById('manual-title').placeholder          = 'ex: Avril 2026';
    document.getElementById('manual-rate').placeholder           = 'ex: 16.00';
    document.getElementById('manual-date').valueAsDate           = new Date();
    document.getElementById('group-actual-received').style.display = '';
  } else {
    document.getElementById('manual-section-title').textContent  = 'Ajouter une mission';
    document.getElementById('label-manual-title').textContent    = 'Titre de la mission';
    document.getElementById('label-manual-date').textContent     = 'Date';
    document.getElementById('manual-title').placeholder          = 'ex: Inventaire Carrefour Marche';
  }

  const hoursInput          = document.getElementById('manual-hours');
  const rateInput           = document.getElementById('manual-rate');
  const actualReceivedInput = document.getElementById('manual-actual-received');
  const preview             = document.getElementById('manual-preview');

  function updatePreview() {
    const h = parseFloat(hoursInput.value);
    const r = parseFloat(rateInput.value);
    const a = parseFloat(actualReceivedInput.value);
    if (h > 0 && r > 0) {
      const estimated = h * r;
      let text = `Estimé (heures × taux) : ${formatEur(estimated)}`;
      if (a > 0) {
        const diff = a - estimated;
        const sign = diff >= 0 ? '+' : '';
        text += `&nbsp;&nbsp;→&nbsp;&nbsp;Reçu réellement : <strong>${formatEur(a)}</strong> <span style="font-size:12px;color:var(--text-muted)">(${sign}${formatEur(diff)})</span>`;
      }
      preview.innerHTML        = text;
      preview.style.color      = 'var(--primary)';
      preview.style.fontWeight = '500';
    } else {
      preview.innerHTML = '';
    }
  }

  hoursInput.addEventListener('input', updatePreview);
  rateInput.addEventListener('input', updatePreview);
  actualReceivedInput.addEventListener('input', updatePreview);

  document.getElementById('btn-manual-save').onclick = async () => {
    const title          = document.getElementById('manual-title').value.trim();
    const date           = document.getElementById('manual-date').value;
    const hours          = parseFloat(document.getElementById('manual-hours').value);
    const rate           = parseFloat(document.getElementById('manual-rate').value);
    const actualRaw      = document.getElementById('manual-actual-received').value.trim();
    const actualReceived = actualRaw !== '' ? parseFloat(actualRaw) : null;
    const resultsDiv     = document.getElementById('manual-results');

    if (!title || !date || !hours || !rate) {
      resultsDiv.innerHTML = '<div class="alert alert-error">Tous les champs sont obligatoires.</div>';
      return;
    }

    try {
      const res = await API.payslips.createManual({
        job_id: jobId, period_start: date, period_end: date,
        hours_declared: hours, hourly_rate: rate, note: title,
        actual_received: actualReceived,
      });
      const actualText = res.actual_received != null
        ? ` &nbsp;|&nbsp; Reçu réel : <strong>${formatEur(res.actual_received)}</strong>`
        : '';
      resultsDiv.innerHTML = `<div class="alert alert-success">${title} enregistrée — Estimé : ${formatEur(res.net_salary)}${actualText}</div>`;
      ['manual-title','manual-date','manual-hours','manual-rate','manual-actual-received'].forEach(id => {
        document.getElementById(id).value = '';
      });
      preview.innerHTML = '';
      await loadPayslips();
    } catch (err) {
      resultsDiv.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  };
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

  document.getElementById('pdf-input').value = '';
}

// ── Modal modifier job ───────────────────────────────────────────────────────
function initEditModal() {
  const modal = document.getElementById('modal-edit');
  document.getElementById('btn-edit-job').onclick    = () => modal.classList.add('open');
  document.getElementById('btn-cancel-edit').onclick = () => modal.classList.remove('open');

  document.getElementById('btn-save-edit').onclick = async () => {
    try {
      await API.jobs.update(jobId, {
        name:          document.getElementById('edit-name').value.trim() || null,
        employer_name: document.getElementById('edit-employer').value.trim() || null,
        hourly_rate:   parseFloat(document.getElementById('edit-rate').value) || null,
      });
      modal.classList.remove('open');
      await loadJob();
    } catch (err) {
      showAlert(document.getElementById('alerts'), err.message, 'error');
    }
  };

  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

init();
