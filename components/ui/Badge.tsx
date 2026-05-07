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
        backgroundColor: `${colors.bg}CC`, // Adding 80% opacity to background
        color: colors.text,
        borderColor: colors.border,
        boxShadow: `0 0 10px ${colors.bg}40` // Subtle glow
      }}
      className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border tracking-widest inline-flex items-center justify-center whitespace-nowrap"
    >
      {label}
    </span>
  );
};

export default Badge;
