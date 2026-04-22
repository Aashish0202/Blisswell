import React from 'react';

/**
 * BulkActionToolbar Component - Selection and bulk actions for tables
 * @param {number} selectedCount - Number of selected items
 * @param {number} totalCount - Total items in view
 * @param {function} onSelectAll - Select all callback
 * @param {function} onClearSelection - Clear selection callback
 * @param {Array} actions - Available bulk actions: [{ label, icon, onClick, variant, disabled }]
 */
const BulkActionToolbar = ({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onClearSelection,
  actions = []
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-action-toolbar slide-up">
      <div className="toolbar-left">
        <div className="selection-info">
          <span className="selected-count">{selectedCount}</span>
          <span className="selected-label">selected</span>
        </div>
        <div className="selection-actions">
          {onSelectAll && selectedCount < totalCount && (
            <button className="btn btn-ghost btn-sm" onClick={onSelectAll}>
              Select all {totalCount}
            </button>
          )}
          {onClearSelection && (
            <button className="btn btn-ghost btn-sm" onClick={onClearSelection}>
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="toolbar-right">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`btn btn-${action.variant || 'secondary'} btn-sm`}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon && <span>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>

      <style>{`
        .bulk-action-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .selection-info {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .selected-count {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .selected-label {
          color: var(--gray-600);
          font-size: 0.875rem;
        }

        .selection-actions {
          display: flex;
          gap: 0.25rem;
        }

        .toolbar-right {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .bulk-action-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-left,
          .toolbar-right {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default BulkActionToolbar;