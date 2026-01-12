import { FC } from 'react';

interface Props {
  error: Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'toast';
}

export const ErrorDisplay: FC<Props> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
}) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  if (variant === 'banner') {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mx-4 my-2">
        <div className="flex items-start gap-3">
          <div className="text-red-400 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-200 text-sm">{message}</p>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-red-300 hover:text-red-100 text-sm underline"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 rounded-lg p-4 shadow-lg max-w-sm z-50">
        <div className="flex items-start gap-3">
          <div className="text-red-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-200 text-sm">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-red-300 hover:text-red-100 text-sm underline mt-2"
              >
                Try again
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="flex items-center gap-2 text-red-400 text-sm p-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline hover:text-red-300">
          Retry
        </button>
      )}
    </div>
  );
};
