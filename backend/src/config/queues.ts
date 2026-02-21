import { Queue } from 'bullmq';
import { env } from './env.js';

const connection = { url: env.REDIS_URL };

function createQueue(name: string): Queue {
  const queue = new Queue(name, { connection });
  queue.on('error', () => {
    // Suppress — Redis reconnects automatically
  });
  return queue;
}

export const analysisOrchestratorQueue = createQueue('analysis-orchestrator');
export const dealSyncQueue = createQueue('deal-sync');
export const patternExtractionQueue = createQueue('pattern-extraction');
export const lookalikeSearchQueue = createQueue('lookalike-search');
export const playbookGenerationQueue = createQueue('playbook-generation');

export const queues = {
  'analysis-orchestrator': analysisOrchestratorQueue,
  'deal-sync': dealSyncQueue,
  'pattern-extraction': patternExtractionQueue,
  'lookalike-search': lookalikeSearchQueue,
  'playbook-generation': playbookGenerationQueue,
} as const;
