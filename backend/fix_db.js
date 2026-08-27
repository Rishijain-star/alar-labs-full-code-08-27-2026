/**
 * Final fix: restore config using direct raw UPDATE
 */
const mysql = require('mysql2/promise');

async function fix() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: '',
    database: 'alar_labs'
  });

  // Read raw
  const [rows] = await conn.execute('SELECT id, config FROM exam_topics_configs WHERE config_key = ?', ['exam_topics']);
  if (!rows.length) { console.log('No row'); await conn.end(); return; }

  const row = rows[0];
  let config = row.config;
  if (typeof config === 'string') {
    config = JSON.parse(config);
  }

  console.log('learningSets:', (config.learningSets||[]).length);

  // Patch: add explanations, type, correctOptionIds
  let changed = 0;
  (config.learningSets || []).forEach(set => {
    (set.questions || []).forEach(q => {
      if (!q.type) { q.type = 'multiple_choice'; changed++; }
      if (!Array.isArray(q.correctOptionIds)) {
        q.correctOptionIds = q.correctOptionId ? [q.correctOptionId] : [];
        changed++;
      }
      if (typeof q.explanation !== 'string' || q.explanation.trim() === '') {
        q.explanation = 'Correct answer: See the highlighted option above.';
        changed++;
      }
    });
  });
  (config.exams || []).forEach(set => {
    (set.questions || []).forEach(q => {
      if (!q.type) q.type = 'multiple_choice';
      if (!Array.isArray(q.correctOptionIds)) q.correctOptionIds = q.correctOptionId ? [q.correctOptionId] : [];
      if (typeof q.explanation !== 'string') q.explanation = '';
    });
  });

  console.log('Changed:', changed, 'fields');

  // Use raw query with proper JSON
  const jsonStr = JSON.stringify(config);
  
  // Use query with explicit cast
  await conn.query('UPDATE exam_topics_configs SET `config` = CAST(? AS JSON) WHERE config_key = ?', [jsonStr, 'exam_topics']);
  
  console.log('Saved! Verifying...');
  const [v] = await conn.execute('SELECT config FROM exam_topics_configs WHERE config_key = ?', ['exam_topics']);
  const saved = v[0].config;
  const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
  console.log('learningSets after save:', (parsed.learningSets||[]).length);
  (parsed.learningSets||[]).forEach((s,i) => {
    console.log(`  Set ${i+1}: "${s.title}"`);
    (s.questions||[]).forEach((q,qi) => {
      console.log(`    Q${qi+1} type:${q.type} expl: ${JSON.stringify((q.explanation||'').substring(0,50))}`);
    });
  });

  await conn.end();
  console.log('\n✅ Done!');
}

fix().catch(e => { console.error('ERROR:', e.message, e.stack); process.exit(1); });
