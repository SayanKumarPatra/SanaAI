import React from 'react';

interface SanaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  customImage?: string | null;
}

export function SanaLogo({ className = '', size = 'sm', onClick, customImage }: SanaLogoProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  }[size];

  // Default image path points to high-res SVG / custom uploaded image
  const imageSrc = customImage || '/sana-logo.svg';

  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer shrink-0 select-none ${sizeClasses} ${className}`}
      title="SANA 3D AI Virtual Assistant"
    >
      {/* Clean Circular Logo Image Badge */}
      <img 
        src={imageSrc} 
        alt="SANA 3D AI Logo" 
        className="w-full h-full object-cover rounded-full shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200" 
      />

      {/* Online Status Green Dot */}
      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
    </div>
  );
}
