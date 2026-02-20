export interface AnalysisProgressEvent {
  analysisId: string;
  step: 'sync' | 'patterns' | 'lookalikes' | 'playbooks' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export interface SyncProgressEvent {
  dealsSynced: number;
  totalDeals: number;
}

export type SSEEvent =
  | { type: 'analysis:progress'; payload: AnalysisProgressEvent }
  | { type: 'analysis:step-complete'; payload: { analysisId: string; step: string } }
  | { type: 'analysis:complete'; payload: { analysisId: string } }
  | { type: 'analysis:error'; payload: { analysisId: string; step: string; error: string } }
  | { type: 'sync:progress'; payload: SyncProgressEvent };
