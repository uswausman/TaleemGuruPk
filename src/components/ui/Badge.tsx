import React from 'react';

export type BadgeVariant =
  | 'blue'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'slate'
  | 'indigo'
  | 'dark';

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  pill?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'sm',
  dot = false,
  icon,
  className = '',
  pill = true,
}) => {
  const sizeClasses: Record<BadgeSize, string> = {
    xs: 'text-[10px] px-2 py-0.5 font-bold gap-1',
    sm: 'text-[11px] px-2.5 py-1 font-bold gap-1.5',
    md: 'text-xs px-3 py-1.5 font-extrabold gap-2',
  };

  const variantClasses: Record<BadgeVariant, { bg: string; dot: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60',
      dot: 'bg-blue-500',
    },
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60',
      dot: 'bg-cyan-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
      dot: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60',
      dot: 'bg-rose-500',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60',
      dot: 'bg-purple-500',
    },
    slate: {
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
      dot: 'bg-indigo-500',
    },
    dark: {
      bg: 'bg-slate-900 text-slate-200 border border-slate-700',
      dot: 'bg-cyan-400',
    },
  };

  const rounding = pill ? 'rounded-full' : 'rounded-lg';
  const selectedStyle = variantClasses[variant] || variantClasses.blue;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap leading-none transition-colors ${rounding} ${sizeClasses[size]} ${selectedStyle.bg} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${selectedStyle.dot}`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
};
