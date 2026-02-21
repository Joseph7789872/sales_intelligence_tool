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

export type SSEEvent =
  | JobProgressEvent
  | JobCompletedEvent
  | JobFailedEvent
  | NotificationEvent;

export function sseChannelForUser(userId: string): string {
  return `sse:user:${userId}`;
}
