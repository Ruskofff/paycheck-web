/**
 * Client API centralisé.
 * Toutes les fonctions retournent la donnée JSON directement
 * ou lèvent une Error avec le message serveur.
 */
const API = (() => {

  async function request(method, url, body = null, isFormData = false) {
    const options = { method, headers: {} };

    if (body) {
      if (isFormData) {
        options.body = body; // FormData — pas de Content-Type manuel
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    return data;
  }

  return {
    // Jobs
    jobs: {
      getAll:   ()         => request('GET',  '/api/jobs'),
      getById:  (id)       => request('GET',  `/api/jobs/${id}`),
      update:   (id, body) => request('PUT',  `/api/jobs/${id}`, body),
    },

    // Fiches de paie
    payslips: {
      getAll:   ()        => request('GET',    '/api/payslips'),
      getByJob: (jobId)   => request('GET',    `/api/payslips/job/${jobId}`),
      import:   (formData)=> request('POST',   '/api/payslips/import', formData, true),
      remove:   (id)      => request('DELETE', `/api/payslips/${id}`),
    },

    // Journal des heures
    timesheet: {
      getByJob: (jobId) => request('GET',    `/api/timesheet/job/${jobId}`),
      create:   (body)  => request('POST',   '/api/timesheet', body),
      remove:   (id)    => request('DELETE', `/api/timesheet/${id}`),
    },

    // Quota
    quota: {
      getCurrent: () => request('GET', '/api/quota'),
    },
  };
})();
