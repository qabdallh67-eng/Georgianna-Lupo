import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const { getAssetUrl, lang } = useApp();
  const [imgError, setImgError] = useState(false);

  const logoUrl = getAssetUrl('official_logo', '/assets/eduverse-logo.png');
  const heightClass = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-16' : 'h-11';

  if (imgError) {
    return (
      <span className={`inline-flex items-center font-extrabold tracking-tight text-[#635BFF] ${className}`}>
        EDUVERSE
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={lang === 'ar' ? 'الشعار الرسمي لمنصة EDUVERSE' : 'Official EDUVERSE Logo'}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={`${heightClass} w-auto object-contain select-none shrink-0 ${className}`}
    />
  );
};
