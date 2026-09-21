import React from 'react';
import { resolvePlayerPosition } from '../utils/positionUtils';

interface PositionBadgeProps {
  position?: string;
  positionLabel?: string;
  size?: 'xs' | 'sm' | 'md';
  showFullName?: boolean;
  className?: string;
}

export const PositionBadge: React.FC<PositionBadgeProps> = ({
  position,
  positionLabel,
  size = 'sm',
  showFullName = false,
  className = '',
}) => {
  const info = resolvePlayerPosition({ position, positionLabel });
  const { badge, positionLabel: tag, positionName } = info;

  const sizeStyles = {
    xs: 'px-1 py-0.2 text-[9px] gap-1',
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold rounded border shrink-0 transition-colors ${badge.bg} ${badge.border} ${badge.text} ${sizeStyles[size]} ${className}`}
      title={`${info.lineName}: ${positionName} (${tag})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0 opacity-80`} />
      <span>{tag}</span>
      {showFullName && (
        <span className="font-sans font-normal text-white/80 text-[10px] ml-0.5 whitespace-nowrap">
          {positionName}
        </span>
      )}
    </span>
  );
};
