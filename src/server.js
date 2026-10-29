const app = require('./app');
const config = require('./config');
const { ensureSchema } = require('./services/mysqlClient');

const start = async () => {
  try {
    await ensureSchema();
    app.listen(config.port, () => {
      console.log(`Click Or Trick backend running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

start();
