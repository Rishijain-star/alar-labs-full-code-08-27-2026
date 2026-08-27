/**
 * Migration Script: Normalize all existing exam_topics_configs questions
 * - Sets type: "multiple_choice" for questions missing type
 * - Sets explanation: "" for questions missing explanation
 * - Sets correctOptionIds: [correctOptionId] for questions missing correctOptionIds
 */

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('alar_labs', 'root', '', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false,
});

const ExamTopicsConfig = sequelize.define('ExamTopicsConfig', {
  config_key: { type: DataTypes.STRING },
  config: { type: DataTypes.JSON },
  is_published: { type: DataTypes.BOOLEAN },
  is_initialized: { type: DataTypes.BOOLEAN },
}, { tableName: 'exam_topics_configs', underscored: true, timestamps: true });

function migrateQuestion(q) {
  if (!q || typeof q !== 'object') return q;

  const type = q.type || 'multiple_choice';
  
  const correctOptionIds = Array.isArray(q.correctOptionIds)
    ? q.correctOptionIds
    : (q.correctOptionId ? [q.correctOptionId] : []);

  const correctOptionId = q.correctOptionId || correctOptionIds[0] || '';
  
  const explanation = (typeof q.explanation === 'string') ? q.explanation : '';

  const options = Array.isArray(q.options)
    ? q.options.map(o => ({ id: o.id, text: typeof o.text === 'string' ? o.text : '' }))
    : [];

  return {
    ...q,
    type,
    correctOptionId,
    correctOptionIds,
    explanation,
    options,
  };
}

function migrateSets(sets) {
  if (!Array.isArray(sets)) return [];
  return sets.map(set => {
    if (!set) return set;
    return {
      ...set,
      questions: Array.isArray(set.questions)
        ? set.questions.map(migrateQuestion)
        : [],
    };
  });
}

async function migrate() {
  await sequelize.authenticate();
  console.log('✅ Connected to MySQL');

  const rows = await ExamTopicsConfig.findAll();
  console.log(`Found ${rows.length} config row(s)\n`);

  for (const row of rows) {
    let config = row.config;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch { config = {}; }
    }
    if (!config || typeof config !== 'object') config = {};

    const learningSets = migrateSets(config.learningSets || []);
    const exams = migrateSets(config.exams || []);

    // Log what we're fixing
    [...learningSets, ...exams].forEach(set => {
      console.log(`Set: "${set.title}" (${set.id})`);
      (set.questions || []).forEach((q, i) => {
        console.log(`  Q${i+1}: "${(q.question||'').substring(0,35)}" => type: ${q.type}, explanation: ${JSON.stringify(q.explanation)}, correctOptionIds: ${JSON.stringify(q.correctOptionIds)}`);
      });
    });

    const newConfig = { ...config, learningSets, exams };
    
    // Force update using raw update to avoid Sequelize JSON mutation issues
    await ExamTopicsConfig.update(
      { config: JSON.stringify(newConfig) },
      { where: { id: row.id } }
    );

    console.log(`\n✅ Migrated config row: ${row.id} (key: ${row.config_key})`);
  }

  console.log('\n🎉 Migration complete! All questions have been normalized.');
  await sequelize.close();
}

migrate().catch(e => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
