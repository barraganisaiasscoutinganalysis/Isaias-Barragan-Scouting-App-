import React, { useState, useEffect, useRef } from 'react';
import defaultLogo from '../assets/logo.svg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncAndLoadSvg = () => {
      try {
        const savedSvg = localStorage.getItem('scout_custom_svg_content');
        if (savedSvg && savedSvg.trim().length > 0) {
          setSvgContent(savedSvg);
          // Persist to server disk automatically
          fetch('/api/save-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ svg: savedSvg })
          }).catch(() => {});
        } else {
          setSvgContent(null);
        }
      } catch (e) {
        // ignore
      }
    };

    syncAndLoadSvg();
    window.addEventListener('storage', syncAndLoadSvg);
    window.addEventListener('scout_logo_updated', syncAndLoadSvg);

    return () => {
      window.removeEventListener('storage', syncAndLoadSvg);
      window.removeEventListener('scout_logo_updated', syncAndLoadSvg);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('Por favor selecciona un archivo con formato .svg');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        localStorage.setItem('scout_custom_svg_content', result);
        setSvgContent(result);
        window.dispatchEvent(new Event('scout_logo_updated'));

        fetch('/api/save-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ svg: result })
        }).catch(() => {});
      }
    };
    reader.readAsText(file);
  };

  const isSm = size === 'sm';
  const isLg = size === 'lg';
  const heightClass = isSm ? 'h-10 sm:h-12' : isLg ? 'h-24 sm:h-32' : 'h-16 sm:h-20';

  // If user uploaded an SVG or saved one, display it natively as an image
  const displaySrc = svgContent
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`
    : defaultLogo;

  return (
    <div className={`flex items-center justify-center w-full select-none ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".svg,image/svg+xml"
        className="hidden"
      />
      <img
        src={displaySrc}
        alt="Logo Isaias Barragan Scouting"
        className={`${heightClass} w-auto max-w-full object-contain cursor-pointer`}
        onClick={() => {
          if (!svgContent) {
            fileInputRef.current?.click();
          }
        }}
      />
    </div>
  );
};
