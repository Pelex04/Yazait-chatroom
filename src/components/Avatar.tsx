// src/components/Avatar.tsx
import { useState } from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnline?: boolean;
  isOnline?: boolean;
}

const Avatar = ({ 
  src, 
  alt, 
  size = 'md', 
  className = '',
  showOnline = false,
  isOnline = false 
}: AvatarProps) => {
  const [imageError, setImageError] = useState(false);

  // Determine if avatar is an emoji or URL
  const isEmoji = src.length <= 4 || /[\u{1F000}-\u{1F9FF}]/u.test(src);
  
  // Check if it's a valid URL (starts with http or /)
  const isUrl = src.startsWith('http') || src.startsWith('/');

  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
    xl: 'w-16 h-16 text-3xl'
  };

  const sizeClass = sizeClasses[size];

  // If it's an emoji, display it
  if (isEmoji && !isUrl) {
    return (
      <div className="relative">
        <div 
          className={`${sizeClass} rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center ${className}`}
          title={alt}
        >
          <span>{src}</span>
        </div>
        {showOnline && isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
        )}
      </div>
    );
  }

  // If it's a URL and image hasn't errored, show image
  if (isUrl && !imageError) {
    return (
      <div className="relative">
        <div className={`${sizeClass} rounded-xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 ${className}`}>
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </div>
        {showOnline && isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
        )}
      </div>
    );
  }

  // Fallback: show first letter of name
  const firstLetter = alt.charAt(0).toUpperCase();
  return (
    <div className="relative">
      <div 
        className={`${sizeClass} rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${className}`}
        title={alt}
      >
        <span>{firstLetter}</span>
      </div>
      {showOnline && isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
      )}
    </div>
  );
};

export default Avatar;