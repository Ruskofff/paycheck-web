require('dotenv').config();
const { pool } = require('./src/config/database');

async function migrate() {
  // ── État actuel ─────────────────────────────────────────────────────────────
  const [before] = await pool.query('SELECT id, name, is_manual FROM jobs ORDER BY id');
  console.log('\nÉtat actuel de la table jobs :');
  before.forEach(j => console.log(`  id=${j.id}  name="${j.name}"  is_manual=${j.is_manual}`));

  // ── Appliquer les changements ────────────────────────────────────────────────
  console.log('\nApplication des changements...');
  await pool.query(`UPDATE jobs SET name = 'Multiwex' WHERE id = 1`);
  await pool.query(`UPDATE jobs SET name = 'Adventure Valley Durbuy', is_manual = 1 WHERE id = 2`);

  // ── Vérification ────────────────────────────────────────────────────────────
  const [after] = await pool.query('SELECT id, name, is_manual FROM jobs ORDER BY id');
  console.log('\nÉtat après migration :');
  after.forEach(j => console.log(`  id=${j.id}  name="${j.name}"  is_manual=${j.is_manual}`));

  const avd = after.find(j => j.id === 2);
  if (avd && avd.is_manual) {
    console.log('\n✓ Migration réussie — redémarre l\'app.');
  } else {
    console.log('\n✗ is_manual toujours à 0 pour Job 2 — vérifie tes droits DB.');
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
