import React from 'react';
import { BADGE_COLORS } from '@/lib/constants';

interface BadgeProps {
  label: string;
  variant: keyof typeof BADGE_COLORS;
}

const Badge: React.FC<BadgeProps> = ({ label, variant }) => {
  const colors = BADGE_COLORS[variant] || BADGE_COLORS.clean;

  return (
    <span 
      style={{ 
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }}
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider"
    >
      {label}
    </span>
  );
};

export default Badge;
