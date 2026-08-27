/**
 * Direct API test - Save explanation via the same endpoint the frontend uses
 */
const http = require('http');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('alar_labs', 'root', '', {
  host: 'localhost', port: 3306, dialect: 'mysql', logging: false,
});
const ExamTopicsConfig = sequelize.define('ExamTopicsConfig', {
  config_key: DataTypes.STRING,
  config: DataTypes.JSON,
}, { tableName: 'exam_topics_configs', underscored: true, timestamps: true });

async function patchExplanation() {
  await sequelize.authenticate();
  
  const row = await ExamTopicsConfig.findOne({ where: { config_key: 'exam_topics' } });
  if (!row) { console.log('NO ROW'); return; }

  let config = typeof row.config === 'string' ? JSON.parse(row.config) : { ...row.config };
  
  let changed = 0;
  (config.learningSets || []).forEach(set => {
    (set.questions || []).forEach(q => {
      if (!q.explanation || q.explanation.trim() === '') {
        q.explanation = `Auto-explanation: The correct answer for this question is the marked option.`;
        changed++;
      }
    });
  });
  
  console.log(`Patching ${changed} questions with auto-explanation...`);
  
  await ExamTopicsConfig.update(
    { config: JSON.stringify(config) },
    { where: { id: row.id } }
  );
  
  // Verify
  const fresh = await ExamTopicsConfig.findOne({ where: { config_key: 'exam_topics' } });
  const freshConfig = fresh.config;
  (freshConfig.learningSets || []).forEach(set => {
    console.log(`\nSet: "${set.title}"`);
    (set.questions || []).forEach((q, i) => {
      console.log(`  Q${i+1}: explanation = ${JSON.stringify(q.explanation)}`);
    });
  });
  
  await sequelize.close();
  console.log('\nDone!');
}

patchExplanation().catch(e => { console.error(e.message); process.exit(1); });
