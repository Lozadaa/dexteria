import { FC } from 'react';
import { AlertBanner, Button } from 'adnia-ui';
import { AlertCircle } from 'lucide-react';
import { t } from '../i18n/t';

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

  // Toast variant - positioned fixed at bottom right
  if (variant === 'toast') {
    return (
      <div className="fixed bottom-4 right-4 max-w-sm z-50" role="alert" aria-live="assertive">
        <AlertBanner
          variant="error"
          icon={<AlertCircle className="w-5 h-5" />}
          description={message}
          onDismiss={onDismiss}
          action={
            onRetry ? (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                {t('actions.tryAgain')}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  // Banner variant - full width with padding
  if (variant === 'banner') {
    return (
      <div className="mx-4 my-2" role="alert" aria-live="polite">
        <AlertBanner
          variant="error"
          icon={<AlertCircle className="w-5 h-5" />}
          description={message}
          onDismiss={onDismiss}
          action={
            onRetry ? (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                {t('actions.retry')}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  // Inline variant - compact
  return (
    <div className="flex items-center gap-2 text-destructive text-sm p-2" role="alert" aria-live="polite">
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline hover:text-destructive/80">
          {t('actions.retry')}
        </button>
      )}
    </div>
  );
};
