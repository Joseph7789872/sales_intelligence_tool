import { dealSyncWorker } from './deal-sync.worker.js';

export function startWorkers(): void {
  console.log('Starting BullMQ workers...');
  console.log('  - deal-sync worker: ready (concurrency: 3)');
}

export async function stopWorkers(): Promise<void> {
  console.log('Stopping BullMQ workers...');
  await dealSyncWorker.close();
  console.log('All workers stopped.');
}

export { dealSyncWorker };
