const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

// Désactiver le worker (non supporté en Node.js sans configuration supplémentaire)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

/**
 * Extrait le texte brut d'un fichier PDF.
 * @param {string} filePath - Chemin absolu vers le fichier PDF
 * @returns {Promise<string>}
 */
async function extractText(filePath) {
  const fs   = require('fs');
  const data  = new Uint8Array(fs.readFileSync(filePath));
  const pdf   = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text    = content.items.map(item => item.str).join(' ');
    fullText += text + '\n';
  }

  return fullText;
}

/**
 * Convertit DD/MM/YYYY → YYYY-MM-DD (format MySQL DATE)
 * @param {string} ddmmyyyy
 * @returns {string|undefined}
 */
function parseDate(ddmmyyyy) {
  const m = ddmmyyyy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Nettoie un montant au format belge (1.234,56 → 1234.56)
 * @param {string} raw
 * @returns {number|undefined}
 */
function parseAmount(raw) {
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const value   = parseFloat(cleaned);
  return isNaN(value) ? undefined : value;
}

/**
 * Parse un PDF Adminbox et extrait les données de la fiche de paie.
 * @param {string} filePath    - Chemin vers le fichier PDF uploadé
 * @param {string} originalName - Nom original du fichier
 * @returns {Promise<ParsedPayslip>}
 *
 * @typedef {Object} ParsedPayslip
 * @property {string}         pdfFilename
 * @property {string|undefined} periodStart   - YYYY-MM-DD
 * @property {string|undefined} periodEnd     - YYYY-MM-DD
 * @property {number|undefined} hoursDeclared
 * @property {number|undefined} hourlyRate
 * @property {number|undefined} netSalary
 * @property {number|undefined} travelAllowance
 */
async function parsePdf(filePath, originalName) {
  const text   = await extractText(filePath);
  const result = { pdfFilename: originalName };

  // Période : "Période: DD/MM/YYYY - DD/MM/YYYY"
  const periodMatch = text.match(/Période:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodMatch) {
    result.periodStart = parseDate(periodMatch[1]);
    result.periodEnd   = parseDate(periodMatch[2]);
  }

  // Toutes les lignes "X,XX u TAUX" — on garde celle avec le plus d'heures (job principal)
  // Si plusieurs missions, le net est recalculé au prorata de la mission principale
  const lineMatches = [...text.matchAll(/([\d,]+)\s*[Uu]\s+([\d,]+)/g)];
  if (lineMatches.length > 0) {
    let missions = [];
    for (const m of lineMatches) {
      const h = parseFloat(m[1].replace(',', '.'));
      const r = parseFloat(m[2].replace(',', '.'));
      if (!isNaN(h) && !isNaN(r)) missions.push({ h, r });
    }

    // Mission principale = celle avec le plus d'heures
    const main = missions.reduce((best, cur) => cur.h > best.h ? cur : best, missions[0]);
    result.hoursDeclared = main.h;
    result.hourlyRate    = main.r;

    // Si plusieurs missions sur la même fiche, le net = brut de la mission principale (h × taux)
    // Les déductions globales (cotisation, etc.) ne sont pas répartissables proprement
    if (missions.length > 1) {
      result._netOverride = parseFloat((main.h * main.r).toFixed(2));
    }
  }

  // Net à payer : "Net   € 91,27"
  const netMatch = text.match(/\bNet\b\s*€\s*([\d,.]+)/);
  if (netMatch) {
    const totalNet = parseAmount(netMatch[1]);
    if (result._netOverride != null) {
      result.netSalary = result._netOverride;
      delete result._netOverride;
    } else {
      result.netSalary = totalNet;
    }
  }

  // Indemnité de déplacement : "Indemnité déplacement ... € 1,82"
  const travelMatch = text.match(/Indemnité déplacement[^€]*€\s*([\d,.]+)/);
  if (travelMatch) {
    result.travelAllowance = parseAmount(travelMatch[1]);
  }

  return result;
}

module.exports = { parsePdf };
