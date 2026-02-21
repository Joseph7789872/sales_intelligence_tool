import 'dotenv/config';
import { startWorkers, stopWorkers } from './index.js';

startWorkers();

const shutdown = async () => {
  await stopWorkers();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
