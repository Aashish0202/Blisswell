import React from 'react';

/**
 * Reusable Prev/Next pagination bar.
 *
 * Props:
 *   page        number  current page (1-based)
 *   totalPages  number  total pages
 *   onChange    fn(newPage)  called when user clicks prev/next
 *   total       number|null  optional total row count to display
 */
const Pagination = ({ page, totalPages, onChange, total = null }) => {
  if (!totalPages || totalPages <= 1) {
    // Still show a row count if provided, but no nav controls for single pages
    if (total != null) {
      return (
        <div className="pagination-bar">
          <span className="pagination-info">
            {total} record{total === 1 ? '' : 's'}
          </span>
        </div>
      );
    }
    return null;
  }

  const go = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    if (next !== page) onChange(next);
  };

  return (
    <div className="pagination-bar">
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        ← Prev
      </button>
      <span className="pagination-info">
        Page {page} of {totalPages}{total != null ? ` · ${total} total` : ''}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        Next →
      </button>

      <style>{`
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 0 0.25rem;
          flex-wrap: wrap;
        }
        .pagination-bar .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .pagination-info {
          font-size: 0.8125rem;
          color: var(--gray-600, #6b7280);
        }
      `}</style>
    </div>
  );
};

export default Pagination;