const { ensureSchema } = require('../src/services/mysqlClient');

ensureSchema()
  .then(() => {
    console.log('Database schema ready.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
