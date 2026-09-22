import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean;
  interactive?: boolean;
  gradientBorder?: boolean;
  padded?: boolean;
  variant?: 'default' | 'flat' | 'elevated' | 'glass' | 'highlight';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      hoverLift = false,
      interactive = false,
      gradientBorder = false,
      padded = true,
      variant = 'default',
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'rounded-2xl transition-all duration-200 relative overflow-hidden text-left';

    const variantClasses = {
      default:
        'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm',
      flat:
        'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800',
      elevated:
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50',
      glass:
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-md',
      highlight:
        'bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 text-white border border-blue-500/30 shadow-xl',
    };

    const liftClass = hoverLift
      ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-slate-950/60 hover:border-blue-400/50 dark:hover:border-blue-500/40'
      : '';

    const interactiveClass = interactive
      ? 'cursor-pointer active:scale-[0.99] select-none'
      : '';

    const paddingClass = padded ? 'p-5 sm:p-6' : '';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${liftClass} ${interactiveClass} ${paddingClass} ${className}`}
        {...props}
      >
        {gradientBorder && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
