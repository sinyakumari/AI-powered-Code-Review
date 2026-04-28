import React from 'react';
import { THEME } from '@/lib/constants';
import Badge from '@/components/ui/Badge';

interface ReviewCardProps {
  filename: string;
  status: any; // variant for badge
  statusLabel: string;
  date: string;
  issuesCount: number;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ 
  filename, 
  status, 
  statusLabel, 
  date, 
  issuesCount 
}) => {
  return (
    <div 
      style={{ 
        backgroundColor: THEME.SURFACE,
        borderColor: THEME.BORDER 
      }}
      className="flex items-center justify-between p-3.5 rounded-lg border hover:border-indigo-500/50 transition-colors group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h4 style={{ color: THEME.TEXT }} className="text-sm font-semibold mb-0.5">
            {filename}
          </h4>
          <p style={{ color: THEME.TEXT_MUTED }} className="text-[10px]">
            {date} • {issuesCount} {issuesCount === 1 ? 'Issue' : 'Issues'} detected
          </p>
        </div>
      </div>
      
      <Badge label={statusLabel} variant={status} />
    </div>
  );
};

export default ReviewCard;
