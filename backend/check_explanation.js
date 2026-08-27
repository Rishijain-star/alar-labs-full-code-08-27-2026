const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('alar_labs', 'root', '', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false,
});

const ExamTopicsConfig = sequelize.define('ExamTopicsConfig', {
  config_key: DataTypes.STRING,
  config: DataTypes.JSON,
}, { tableName: 'exam_topics_configs', underscored: true, timestamps: true });

// Simulate the backend normalizeQuestion
function normalizeQuestion(q) {
  if (!q || typeof q !== 'object') return null;
  const type = q.type || 'multiple_choice';
  const correctOptionIds = Array.isArray(q.correctOptionIds)
    ? q.correctOptionIds
    : q.correctOptionId ? [q.correctOptionId] : [];
  const correctOptionId = q.correctOptionId || correctOptionIds[0] || '';
  const explanation = typeof q.explanation === 'string' ? q.explanation : '';
  return { ...q, type, correctOptionId, correctOptionIds, explanation };
}

async function check() {
  await sequelize.authenticate();
  const row = await ExamTopicsConfig.findOne({ where: { config_key: 'exam_topics' } });
  if (!row) { console.log('NO ROW FOUND'); return; }

  const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
  const sets = config.learningSets || [];

  sets.forEach((set, si) => {
    console.log(`\n=== Set ${si+1}: "${set.title}" ===`);
    (set.questions || []).forEach((q, qi) => {
      const norm = normalizeQuestion(q);
      console.log(`  Q${qi+1}: "${(q.question || '').substring(0, 40)}"`);
      console.log(`       RAW explanation: ${JSON.stringify(q.explanation)}`);
      console.log(`       NORM explanation: ${JSON.stringify(norm.explanation)}`);
      console.log(`       NORM type: ${norm.type}`);
    });
  });

  await sequelize.close();
}

check().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
