// ── SSE Event Types ────────────────────────────

export interface JobProgressEvent {
  type: 'job:progress';
  payload: {
    jobId: string;
    queueName: string;
    progress: number;
    data?: Record<string, unknown>;
  };
}

export interface JobCompletedEvent {
  type: 'job:completed';
  payload: {
    jobId: string;
    queueName: string;
    result: Record<string, unknown>;
  };
}

export interface JobFailedEvent {
  type: 'job:failed';
  payload: {
    jobId: string;
    queueName: string;
    error: string;
  };
}

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationEvent {
  type: 'notification';
  payload: {
    notificationType: string;
    title: string;
    message: string;
    severity: NotificationSeverity;
  };
}

// ── Analysis-Specific Events ─────────────────────

export type AnalysisStep = 'patterns' | 'lookalikes' | 'playbooks' | 'complete' | 'error';

export interface AnalysisProgressEvent {
  type: 'analysis:progress';
  payload: {
    analysisId: string;
    step: AnalysisStep;
    progress: number;
    message: string;
  };
}

export interface AnalysisStepCompleteEvent {
  type: 'analysis:step-complete';
  payload: {
    analysisId: string;
    step: string;
  };
}

export interface AnalysisCompleteEvent {
  type: 'analysis:complete';
  payload: {
    analysisId: string;
  };
}

export interface AnalysisErrorEvent {
  type: 'analysis:error';
  payload: {
    analysisId: string;
    step: string;
    error: string;
  };
}

export type SSEEvent =
  | JobProgressEvent
  | JobCompletedEvent
  | JobFailedEvent
  | NotificationEvent
  | AnalysisProgressEvent
  | AnalysisStepCompleteEvent
  | AnalysisCompleteEvent
  | AnalysisErrorEvent;

export function sseChannelForUser(userId: string): string {
  return `sse:user:${userId}`;
}
