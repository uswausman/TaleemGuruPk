import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'table-row';
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  count = 1,
}) => {
  const baseClasses =
    'animate-pulse bg-slate-200/80 dark:bg-slate-800/80 rounded-lg';

  const getVariantClass = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full w-10 h-10';
      case 'text':
        return 'h-4 w-full';
      case 'rect':
        return 'h-24 w-full rounded-xl';
      case 'card':
        return 'h-48 w-full rounded-2xl';
      case 'table-row':
        return 'h-12 w-full rounded-xl';
      default:
        return 'h-4 w-full';
    }
  };

  if (count > 1) {
    return (
      <div className="space-y-2.5 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${getVariantClass()} ${className}`}
          />
        ))}
      </div>
    );
  }

  return <div className={`${baseClasses} ${getVariantClass()} ${className}`} />;
};

export const TestCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24 h-4 rounded-full" />
        <Skeleton variant="text" className="w-16 h-4 rounded-full" />
      </div>
      <Skeleton variant="text" className="w-4/5 h-6" />
      <Skeleton variant="text" className="w-full h-3" />
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <Skeleton variant="text" className="w-20 h-4" />
        <Skeleton variant="text" className="w-28 h-8 rounded-xl" />
      </div>
    </div>
  );
};
