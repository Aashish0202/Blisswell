import React, { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

/**
 * ExportMenu — a dropdown offering CSV / Excel / PDF export.
 *
 * @param {Function} fetchAll  - async () => rows[]  (should return ALL rows, not
 *                               just the current page — this is the whole point)
 * @param {Array}   columns   - [{ key, label }]
 * @param {string}  filename   - filename without extension
 * @param {string}  title      - optional title printed at the top of the PDF
 * @param {boolean} disabled   - disable when there is nothing to export
 */
const ExportMenu = ({ fetchAll, columns = [], filename = 'export', title, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const run = async (format) => {
    if (busy) return;
    setOpen(false);
    try {
      setBusy(true);
      const rows = await fetchAll();
      if (!rows || rows.length === 0) return;
      if (format === 'xlsx') exportToExcel(rows, columns, filename);
      else if (format === 'pdf') await exportToPDF(rows, columns, filename, title);
      else exportToCSV(rows, columns, filename);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-menu" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={disabled || busy}
        onClick={() => setOpen(o => !o)}
      >
        <span>📥</span> {busy ? 'Exporting…' : 'Export'}
      </button>
      {open && (
        <div className="export-menu-dropdown">
          <button type="button" onClick={() => run('csv')}>CSV (Excel-compatible)</button>
          <button type="button" onClick={() => run('xlsx')}>Excel (.xls)</button>
          <button type="button" onClick={() => run('pdf')}>PDF</button>
        </div>
      )}

      <style>{`
        .export-menu { position: relative; display: inline-block; }
        .export-menu-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 4px);
          z-index: 50;
          background: white;
          border: 1px solid var(--gray-200, #e5e7eb);
          border-radius: var(--radius-lg, 0.5rem);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          min-width: 180px;
          overflow: hidden;
        }
        .export-menu-dropdown button {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.625rem 1rem;
          background: none;
          border: none;
          font-size: 0.875rem;
          color: var(--gray-700, #374151);
          cursor: pointer;
          font-family: inherit;
        }
        .export-menu-dropdown button:hover {
          background: var(--gray-50, #f9fafb);
        }
      `}</style>
    </div>
  );
};

export default ExportMenu;