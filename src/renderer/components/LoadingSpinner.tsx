import { FC } from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: FC<Props> = ({
  size = 'md',
  message,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
      />
      {message && (
        <p className="text-sm text-gray-400">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-50">
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
  <div className={`animate-pulse bg-gray-700 rounded ${className}`} />
);

export const TaskCardSkeleton: FC = () => (
  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
    <Skeleton className="h-4 w-3/4 mb-2" />
    <Skeleton className="h-3 w-1/2 mb-3" />
    <div className="flex gap-1">
      <Skeleton className="h-5 w-12 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  </div>
);

export const BoardSkeleton: FC = () => (
  <div className="flex gap-4 p-4 overflow-x-auto">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex-shrink-0 w-72">
        <Skeleton className="h-6 w-24 mb-3" />
        <div className="space-y-2">
          <TaskCardSkeleton />
          <TaskCardSkeleton />
          {i % 2 === 0 && <TaskCardSkeleton />}
        </div>
      </div>
    ))}
  </div>
);
