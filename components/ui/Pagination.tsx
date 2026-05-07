'use client';

import React from 'react';

/**
 * Pagination Component
 * 
 * A reusable pagination bar with a page counter and navigation arrows.
 * Matches specific design requirements for a dark-themed, minimal pagination bar.
 */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  transparent?: boolean;
}

// Design Tokens (provided in requirements)
const COLORS = {
  BACKGROUND: '#0d1627',
  SURFACE: '#131b2e',
  SURFACE_HIGH: '#222a3d',
  BORDER: '#2d3449',
  TEXT: '#dae2fd',
  MUTED: '#928ea1',
  OUTLINE: '#474555',
} as const;

// Text Strings
const LABELS = {
  PAGE: 'Page: ',
  SEPARATOR: ' / ',
  PREV_ARIA: 'Previous Page',
  NEXT_ARIA: 'Next Page',
} as const;

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  transparent = false,
}) => {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const handlePrevious = () => {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="pagination-wrapper">
      <style>{`
        .pagination-wrapper {
          width: 100%;
          background-color: ${transparent ? 'transparent' : COLORS.BACKGROUND};
          border-top: ${transparent ? 'none' : `1px solid ${COLORS.BORDER}`};
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .page-info {
          font-size: 13px;
          color: ${COLORS.MUTED};
          user-select: none;
        }

        .current-page-num {
          color: ${COLORS.TEXT};
          font-weight: 700;
          margin-left: 2px;
        }

        .nav-controls {
          display: flex;
          gap: 8px;
        }

        .nav-btn {
          width: 32px;
          height: 32px;
          background-color: ${COLORS.SURFACE};
          border: 1px solid ${COLORS.BORDER};
          border-radius: 8px;
          color: ${COLORS.MUTED};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
          outline: none;
        }

        .nav-btn:hover:not(:disabled) {
          background-color: ${COLORS.SURFACE_HIGH};
          border-color: ${COLORS.OUTLINE};
          color: ${COLORS.TEXT};
        }

        .nav-btn:disabled {
          color: ${COLORS.OUTLINE};
          cursor: not-allowed;
          opacity: 0.5;
        }

        .icon-svg {
          width: 16px;
          height: 16px;
        }
      `}</style>

      <div className="page-info">
        <span>{LABELS.PAGE}</span>
        <span className="current-page-num">{currentPage}</span>
        <span>{LABELS.SEPARATOR}{totalPages}</span>
      </div>

      <div className="nav-controls">
        <button
          className="nav-btn"
          onClick={handlePrevious}
          disabled={isFirstPage}
          aria-label={LABELS.PREV_ARIA}
        >
          <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className="nav-btn"
          onClick={handleNext}
          disabled={isLastPage}
          aria-label={LABELS.NEXT_ARIA}
        >
          <svg className="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
