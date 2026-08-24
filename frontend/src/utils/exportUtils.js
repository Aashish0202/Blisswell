// Centralized client-side export helpers: CSV, Excel (.xls via HTML table —
// opens natively in Excel/LibreOffice without any dependency), and PDF
// (via html2pdf.js, already a project dependency).
//
// All three take an array of row objects + a columns spec [{key, label}].

const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  let v = typeof value === 'string' ? value : String(value);
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    v = `"${v.replace(/"/g, '""')}"`;
  }
  return v;
};

export const exportToCSV = (data, columns, filename = 'export') => {
  if (!data || data.length === 0) return;
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row => columns.map(c => escapeCsv(row[c.key])).join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
};

export const exportToExcel = (data, columns, filename = 'export') => {
  if (!data || data.length === 0) return;
  // Build an HTML table Excel can parse; the .xls extension + ms-excel MIME
  // make Excel open it as a spreadsheet. No external library needed.
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const thead = `<tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr>`;
  const tbody = data.map(row =>
    `<tr>${columns.map(c => `<td>${esc(row[c.key])}</td>`).join('')}</tr>`
  ).join('');
  const html = `<table border="1">${thead}${tbody}</table>`;
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${filename}.xls`);
};

export const exportToPDF = async (data, columns, filename = 'export', title) => {
  if (!data || data.length === 0) return;
  const html2pdf = (await import('html2pdf.js')).default;
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const container = document.createElement('div');
  container.style.padding = '8px';
  if (title) {
    container.innerHTML += `<h3 style="font-family:Arial;margin:0 0 8px;">${esc(title)}</h3>`;
  }
  const tableHtml = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial;font-size:11px;width:100%;">
    <thead><tr style="background:#f3f4f6;">${columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row => `<tr>${columns.map(c => `<td>${esc(row[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
  container.innerHTML += tableHtml;

  await html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  }).from(container).save();
};

const triggerDownload = (blob, name) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
};