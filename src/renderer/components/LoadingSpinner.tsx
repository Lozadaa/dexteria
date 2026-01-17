import { FC } from 'react';
import { Spinner, Skeleton as AdniaSkeleton } from 'adnia-ui';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

// Map Dexteria sizes to adnia-ui sizes
const sizeMap = {
  sm: 'sm' as const,
  md: 'md' as const,
  lg: 'lg' as const,
};

export const LoadingSpinner: FC<Props> = ({
  size = 'md',
  message,
  fullScreen = false,
}) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Spinner size={sizeMap[size]} label={message} variant="primary" />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ className = '' }) => (
  <AdniaSkeleton className={className} />
);

export const TaskCardSkeleton: FC = () => (
  <div className="bg-card rounded-lg p-3 border border-border">
    <AdniaSkeleton className="h-4 w-3/4 mb-2" />
    <AdniaSkeleton className="h-3 w-1/2 mb-3" />
    <div className="flex gap-1">
      <AdniaSkeleton className="h-5 w-12 rounded-full" />
      <AdniaSkeleton className="h-5 w-16 rounded-full" />
    </div>
  </div>
);

export const BoardSkeleton: FC = () => (
  <div className="flex gap-4 p-4 overflow-x-auto">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex-shrink-0 w-72">
        <AdniaSkeleton className="h-6 w-24 mb-3" />
        <div className="space-y-2">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          {i % 2 === 0 && <TaskCardSkeleton />}
        </div>
      </div>
    ))}
  </div>
);
