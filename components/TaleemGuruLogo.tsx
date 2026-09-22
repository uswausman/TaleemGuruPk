import React from 'react';

export type LogoVariant = 'full' | 'horizontal' | 'compact' | 'icon';
export type LogoTheme = 'light' | 'dark' | 'auto';

interface TaleemGuruLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  className?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
  onClick?: () => void;
  id?: string;
}

export const TaleemGuruLogo: React.FC<TaleemGuruLogoProps> = ({
  variant = 'full',
  theme = 'auto',
  className = '',
  alt = 'Taleem Guru Official Logo',
  loading = 'lazy',
  onClick,
  id,
}) => {
  let src = '/assets/taleemguru-logo-original.png';

  if (variant === 'icon') {
    src = '/favicon.svg';
  } else {
    // Master Full Original Logo
    src = '/assets/taleemguru-logo-original.png';
  }

  return (
    <img
      id={id}
      src={src}
      alt={alt}
      loading={loading}
      onClick={onClick}
      className={`object-contain select-none transition-transform duration-200 ${className}`}
    />
  );
};

export default TaleemGuruLogo;
