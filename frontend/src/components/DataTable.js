import React, { useState, useMemo } from 'react';

/**
 * DataTable Component - Sortable, selectable table with pagination
 * @param {Array} columns - Column definitions: [{ key, label, sortable, render, width }]
 * @param {Array} data - Table data
 * @param {string} keyField - Unique key field for rows
 * @param {Array} selectedRows - Selected row IDs
 * @param {function} onSelectionChange - Selection change callback
 * @param {boolean} selectable - Enable row selection
 * @param {object} pagination - Pagination config: { page, pageSize, total, onPageChange }
 * @param {object} sorting - Sorting config: { key, direction, onChange }
 * @param {boolean} loading - Show loading state
 */
const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  selectedRows = [],
  onSelectionChange,
  selectable = false,
  pagination,
  sorting,
  loading = false,
  emptyMessage = 'No data available'
}) => {
  const [localSort, setLocalSort] = useState({ key: null, direction: 'asc' });

  // Use controlled sorting or local state
  const currentSort = sorting || localSort;
  const handleSort = (key) => {
    if (sorting?.onChange) {
      sorting.onChange(key);
    } else {
      setLocalSort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    }
  };

  // Sort data locally if not controlled
  const sortedData = useMemo(() => {
    if (!currentSort.key || sorting) return data;
    return [...data].sort((a, b) => {
      const aVal = a[currentSort.key];
      const bVal = b[currentSort.key];
      const modifier = currentSort.direction === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * modifier;
      if (aVal > bVal) return 1 * modifier;
      return 0;
    });
  }, [data, currentSort, sorting]);

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map(row => row[keyField]));
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      onSelectionChange?.(selectedRows.filter(rowId => rowId !== id));
    } else {
      onSelectionChange?.([...selectedRows, id]);
    }
  };

  const renderPagination = () => {
    if (!pagination) return null;
    const { page = 1, pageSize = 10, total = 0, onPageChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);

    return (
      <div className="data-table-pagination">
        <span className="pagination-info">
          Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
        </span>
        <div className="pagination-controls">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
          >
            Previous
          </button>
          <span className="pagination-pages">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="data-table-loading">
        <div className="spinner"></div>
        <span>Loading data...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="data-table-empty">
        <span className="empty-icon">📋</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && (
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={col.sortable ? 'sortable' : ''}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="th-content">
                  <span>{col.label}</span>
                  {col.sortable && currentSort.key === col.key && (
                    <span className="sort-indicator">
                      {currentSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const rowId = row[keyField];
            const isSelected = selectedRows.includes(rowId);

            return (
              <tr
                key={rowId}
                className={isSelected ? 'selected' : ''}
                onClick={() => selectable && handleSelectRow(rowId)}
              >
                {selectable && (
                  <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(rowId)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {renderPagination()}

      <style>{`
        .data-table-wrapper {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--text-sm);
        }

        .data-table th {
          background: var(--gray-50);
          font-weight: 600;
          color: var(--gray-700);
          text-align: left;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--gray-200);
          white-space: nowrap;
          text-transform: uppercase;
          font-size: 0.6875rem;
          letter-spacing: 0.05em;
        }

        .data-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .data-table th.sortable:hover {
          background: var(--gray-100);
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-indicator {
          color: var(--primary-500);
        }

        .data-table td {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--gray-100);
          color: var(--gray-700);
          vertical-align: middle;
        }

        .data-table tbody tr {
          transition: background var(--transition-fast);
        }

        .data-table tbody tr:hover {
          background: var(--gray-50);
        }

        .data-table tbody tr.selected {
          background: var(--primary-50);
        }

        .checkbox-cell {
          width: 40px;
          text-align: center;
        }

        .checkbox-cell input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .data-table-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-top: 1px solid var(--gray-100);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .pagination-info {
          font-size: 0.8125rem;
          color: var(--gray-500);
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .pagination-pages {
          font-size: 0.8125rem;
          color: var(--gray-600);
        }

        .data-table-loading,
        .data-table-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: var(--gray-500);
          gap: 1rem;
        }

        .data-table-empty .empty-icon {
          font-size: 2.5rem;
          opacity: 0.5;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .data-table {
            font-size: 0.8125rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.75rem 0.5rem;
          }

          .data-table-pagination {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            text-align: center;
          }

          .pagination-controls {
            justify-content: center;
          }

          .pagination-info {
            font-size: 0.75rem;
          }

          .pagination-pages {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .data-table th,
          .data-table td {
            padding: 0.625rem 0.375rem;
          }

          .th-content {
            font-size: 0.625rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DataTable;