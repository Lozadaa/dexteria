import React from 'react';
import { Clock } from 'lucide-react';
import { useNow } from '../hooks/useNow';
import { formatDoneTime } from '../lib/timeUtils';
import { cn } from '../lib/utils';

interface DoneTimeChipProps {
  /** ISO timestamp string or Unix timestamp (ms) */
  completedAt: string | number;
  /** Locale for formatting (default: "es-ES") */
  locale?: string;
  /** Custom className for styling */
  className?: string;
}

/**
 * Display a chip showing how long ago a task was completed.
 * Updates automatically every 60 seconds via global clock.
 *
 * @example
 * <DoneTimeChip completedAt={task.completedAt} />
 */
export const DoneTimeChip: React.FC<DoneTimeChipProps> = ({
  completedAt,
  locale = "es-ES",
  className,
}) => {
  const now = useNow(60000); // Update every minute
  const formattedTime = formatDoneTime(completedAt, now, locale);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-green-500/10 text-green-400 border border-green-500/20",
        "text-[10px] font-medium tracking-wide",
        "transition-colors",
        className
      )}
      title={`Completado: ${new Date(completedAt).toLocaleString(locale)}`}
    >
      <Clock className="w-2.5 h-2.5" />
      <span>{formattedTime}</span>
    </div>
  );
};
