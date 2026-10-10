import React from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext';

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
  alt,
  loading = 'lazy',
  onClick,
  id,
}) => {
  const { logoUrl, logoAlt, siteName } = useSiteSettings();

  let src = logoUrl || '/assets/taleemguru-logo-original.png';

  if (variant === 'icon') {
    src = '/favicon.svg';
  }

  const effectiveAlt = alt || logoAlt || `${siteName} Official Logo`;

  return (
    <img
      id={id}
      src={src}
      alt={effectiveAlt}
      loading={loading}
      onClick={onClick}
      className={`object-contain select-none transition-transform duration-200 ${className}`}
    />
  );
};

export default TaleemGuruLogo;
