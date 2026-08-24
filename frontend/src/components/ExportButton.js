import React, { useState } from 'react';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

/**
 * ExportButton — export data to CSV, Excel (.xls), or PDF.
 *
 * @param {Array}   data      - rows to export (current page)
 * @param {Array}   columns   - [{ key, label }]
 * @param {string}  filename  - filename without extension
 * @param {string}  format    - 'csv' | 'xlsx' | 'pdf'
 * @param {string}  label     - button label
 * @param {boolean} disabled  - disable export
 * @param {Function} fetchAll - optional async () => rows[] ; if provided,
 *                               the button fetches ALL rows on click instead
 *                               of exporting only the current page's `data`.
 */
const ExportButton = ({
  data = [],
  columns = [],
  filename = 'export',
  format = 'csv',
  label = 'Export',
  disabled = false,
  fetchAll = null
}) => {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const rows = fetchAll ? await fetchAll() : data;
      if (!rows || rows.length === 0) return;
      if (format === 'xlsx') {
        exportToExcel(rows, columns, filename);
      } else if (format === 'pdf') {
        await exportToPDF(rows, columns, filename, label);
      } else {
        exportToCSV(rows, columns, filename);
      }
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={handleExport}
      disabled={disabled || busy || (data.length === 0 && !fetchAll)}
    >
      <span>📥</span> {busy ? 'Exporting…' : label}
    </button>
  );
};

export default ExportButton;