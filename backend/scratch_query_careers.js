const db = require('./src/models');
db.sequelize.query('SELECT * FROM career_offerings ORDER BY id DESC LIMIT 5').then(res => console.log(res[0])).catch(console.error).finally(() => process.exit(0));
