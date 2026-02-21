import { dealSyncWorker } from './deal-sync.worker.js';
import { analysisOrchestratorWorker } from './analysis-orchestrator.worker.js';
import { closePublisher } from '../services/sse-publisher.js';

export function startWorkers(): void {
  console.log('Starting BullMQ workers...');
  console.log('  - deal-sync worker: ready (concurrency: 3)');
  console.log('  - analysis-orchestrator worker: ready (concurrency: 1)');
}

export async function stopWorkers(): Promise<void> {
  console.log('Stopping BullMQ workers...');
  await dealSyncWorker.close();
  await analysisOrchestratorWorker.close();
  await closePublisher();
  console.log('All workers stopped.');
}

export { dealSyncWorker, analysisOrchestratorWorker };
