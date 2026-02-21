import { usePlaybookFeedback } from '../hooks/usePlaybookFeedback';

interface FeedbackButtonsProps {
  playbookId: string;
  currentFeedback: string | null;
  analysisId: string;
}

export function FeedbackButtons({
  playbookId,
  currentFeedback,
  analysisId,
}: FeedbackButtonsProps) {
  const { mutate, isPending } = usePlaybookFeedback(analysisId);

  const handleFeedback = (feedback: 'thumbs_up' | 'thumbs_down') => {
    if (isPending) return;
    mutate({ playbookId, feedback });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">Helpful?</span>
      <button
        onClick={() => handleFeedback('thumbs_up')}
        disabled={isPending}
        className={`rounded-md p-1.5 transition-colors ${
          currentFeedback === 'thumbs_up'
            ? 'bg-success/20 text-success'
            : 'text-text-muted hover:bg-surface-200 hover:text-text-primary'
        } disabled:opacity-50`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"
          />
        </svg>
      </button>
      <button
        onClick={() => handleFeedback('thumbs_down')}
        disabled={isPending}
        className={`rounded-md p-1.5 transition-colors ${
          currentFeedback === 'thumbs_down'
            ? 'bg-error/20 text-error'
            : 'text-text-muted hover:bg-surface-200 hover:text-text-primary'
        } disabled:opacity-50`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"
          />
        </svg>
      </button>
    </div>
  );
}
