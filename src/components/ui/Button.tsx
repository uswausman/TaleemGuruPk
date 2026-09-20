import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'danger'
  | 'amber'
  | 'cyan'
  | 'admin';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styling
    const baseClasses =
      'inline-flex items-center justify-center font-bold transition-all duration-150 select-none rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]';

    // Size variants
    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'text-xs px-2.5 py-1 gap-1.5 min-h-[32px]',
      sm: 'text-xs px-3.5 py-2 gap-1.5 min-h-[38px]',
      md: 'text-xs sm:text-sm px-4 sm:px-5 py-2.5 sm:py-3 gap-2 min-h-[44px]',
      lg: 'text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 gap-2.5 min-h-[48px]',
    };

    // Style variants
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 focus:ring-blue-500 border border-blue-500/30',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-700 focus:ring-slate-600 shadow-sm',
      outline:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus:ring-blue-500',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:ring-slate-500',
      success:
        'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 focus:ring-emerald-500 border border-emerald-500/30',
      danger:
        'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 focus:ring-rose-500 border border-rose-500/30',
      amber:
        'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25 focus:ring-amber-500 border border-amber-500/30',
      cyan:
        'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/25 focus:ring-cyan-500 border border-cyan-500/30',
      admin:
        'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 focus:ring-emerald-500 border border-emerald-400/30',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-1 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
