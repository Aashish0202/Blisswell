import React from 'react';

/**
 * ExportButton Component - Export data to CSV/Excel
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions: [{ key, label }]
 * @param {string} filename - Export filename (without extension)
 * @param {string} format - Export format: 'csv' or 'xlsx'
 * @param {string} label - Button label
 * @param {boolean} disabled - Disable export
 */
const ExportButton = ({
  data = [],
  columns = [],
  filename = 'export',
  format = 'csv',
  label = 'Export',
  disabled = false
}) => {
  const exportToCSV = () => {
    if (data.length === 0) return;

    // Create CSV header
    const headers = columns.map(col => col.label).join(',');

    // Create CSV rows
    const rows = data.map(row =>
      columns.map(col => {
        let value = row[col.key];

        // Handle special characters and commas
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }

        return value ?? '';
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExport = () => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      // For xlsx, we'd need a library like xlsx
      // For now, fallback to CSV
      exportToCSV();
    }
  };

  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      <span>📥</span> {label}
    </button>
  );
};

export default ExportButton;