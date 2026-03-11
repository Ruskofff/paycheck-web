/* global API, formatDate, showAlert */

let allEntries = [];
let currentFilter = 'all';

async function init() {
  document.getElementById('entry-date').valueAsDate = new Date();
  await loadAll();
  initForm();
  initFilters();
  initHoursPreview();
}

// ── Charger toutes les entrées ────────────────────────────────────────────────
async function loadAll() {
  try {
    const [entriesA, entriesB] = await Promise.all([
      API.timesheet.getByJob(1),
      API.timesheet.getByJob(2),
    ]);

    allEntries = [
      ...entriesA.map(e => ({ ...e, job_name: 'Job A' })),
      ...entriesB.map(e => ({ ...e, job_name: 'Job B' })),
    ].sort((a, b) => new Date(b.work_date) - new Date(a.work_date));

    renderTable();
  } catch (err) {
    showAlert(document.getElementById('alerts'), err.message, 'error');
  }
}

// ── Rendu du tableau ──────────────────────────────────────────────────────────
function renderTable() {
  const tbody   = document.getElementById('timesheet-tbody');
  const entries = currentFilter === 'all'
    ? allEntries
    : allEntries.filter(e => e.job_id === parseInt(currentFilter));

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">Aucune entrée pour ce filtre.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td>${formatDate(e.work_date)}</td>
      <td><span class="badge ${e.job_id === 1 ? 'badge-blue' : 'badge-green'}">${e.job_name}</span></td>
      <td>${e.time_start ? e.time_start.substring(0, 5) : '—'}</td>
      <td>${e.time_end   ? e.time_end.substring(0, 5)   : '—'}</td>
      <td>${e.break_minutes > 0 ? e.break_minutes + ' min' : '—'}</td>
      <td><strong>${parseFloat(e.hours_worked).toFixed(2)} h</strong></td>
      <td>${e.note || '—'}</td>
      <td>
        <button class="btn btn-danger" style="padding:4px 10px;font-size:12px"
          onclick="deleteEntry(${e.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// ── Aperçu des heures calculées en temps réel ─────────────────────────────────
function initHoursPreview() {
  const preview = document.getElementById('hours-preview');

  function updatePreview() {
    const start  = document.getElementById('entry-time-start').value;
    const end    = document.getElementById('entry-time-end').value;
    const pause  = parseInt(document.getElementById('entry-break').value) || 0;

    if (!start || !end) { preview.textContent = ''; return; }

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm) - pause;

    if (totalMin <= 0) {
      preview.textContent = 'Durée invalide';
      preview.style.color = 'var(--danger)';
    } else {
      const h   = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      preview.textContent = `= ${h}h${min > 0 ? min + 'min' : ''}`;
      preview.style.color = 'var(--primary)';
    }
  }

  ['entry-time-start', 'entry-time-end', 'entry-break'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });
}

// ── Formulaire ajout ──────────────────────────────────────────────────────────
function initForm() {
  document.getElementById('btn-add-entry').addEventListener('click', async () => {
    const job_id       = parseInt(document.getElementById('entry-job').value);
    const work_date    = document.getElementById('entry-date').value;
    const time_start   = document.getElementById('entry-time-start').value;
    const time_end     = document.getElementById('entry-time-end').value;
    const break_minutes = parseInt(document.getElementById('entry-break').value) || 0;
    const note         = document.getElementById('entry-note').value.trim() || null;

    if (!work_date || !time_start || !time_end) {
      showAlert(document.getElementById('alerts'), 'Date, pointage et dépointage sont obligatoires.', 'error');
      return;
    }

    try {
      await API.timesheet.create({ job_id, work_date, time_start, time_end, break_minutes, note });
      document.getElementById('entry-time-start').value = '';
      document.getElementById('entry-time-end').value   = '';
      document.getElementById('entry-break').value      = '0';
      document.getElementById('entry-note').value       = '';
      document.getElementById('hours-preview').textContent = '';
      await loadAll();
    } catch (err) {
      showAlert(document.getElementById('alerts'), err.message, 'error');
    }
  });
}

// ── Filtres ───────────────────────────────────────────────────────────────────
function initFilters() {
  ['all', '1', '2'].forEach(val => {
    const btn = document.querySelector(`[data-job="${val}"]`);
    btn.addEventListener('click', () => {
      currentFilter = val;
      document.querySelectorAll('[data-job]').forEach(b => b.className = 'btn btn-ghost');
      btn.className = 'btn btn-primary';
      renderTable();
    });
  });
}

// ── Suppression ───────────────────────────────────────────────────────────────
async function deleteEntry(id) {
  if (!confirm('Supprimer cette entrée ?')) return;
  try {
    await API.timesheet.remove(id);
    await loadAll();
  } catch (err) {
    showAlert(document.getElementById('alerts'), err.message, 'error');
  }
}

init();
