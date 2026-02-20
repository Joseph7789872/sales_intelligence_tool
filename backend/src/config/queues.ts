import { Queue } from 'bullmq';
import { env } from './env.js';

// Use URL string to avoid ioredis version mismatch between bullmq's bundled ioredis and ours
const connection = { url: env.REDIS_URL };

export const analysisOrchestratorQueue = new Queue('analysis-orchestrator', { connection });
export const dealSyncQueue = new Queue('deal-sync', { connection });
export const patternExtractionQueue = new Queue('pattern-extraction', { connection });
export const lookalikeSearchQueue = new Queue('lookalike-search', { connection });
export const playbookGenerationQueue = new Queue('playbook-generation', { connection });

export const queues = {
  'analysis-orchestrator': analysisOrchestratorQueue,
  'deal-sync': dealSyncQueue,
  'pattern-extraction': patternExtractionQueue,
  'lookalike-search': lookalikeSearchQueue,
  'playbook-generation': playbookGenerationQueue,
} as const;
