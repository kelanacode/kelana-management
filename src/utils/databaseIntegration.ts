import { DatabaseTable, DatabaseField } from '../types';

/**
 * Format a cell's raw value into human-readable text
 */
export const formatCellValue = (field: DatabaseField, val: any): string => {
  if (val === null || val === undefined || val === '') return '';
  if (field.type === 'select' && field.options) {
    const opt = field.options.find((o) => o.id === val);
    return opt ? opt.label : String(val);
  }
  if (field.type === 'checkbox') {
    return val ? 'Ya / Selesai' : 'Tidak / Belum';
  }
  if (field.type === 'number') {
    return new Intl.NumberFormat('id-ID').format(val);
  }
  return String(val);
};

/**
 * Generate CSV string compatible with Google Sheets & Excel
 */
export const generateCSV = (table: DatabaseTable): string => {
  const header = table.fields.map((f) => `"${f.name.replace(/"/g, '""')}"`).join(',');
  const rows = table.rows.map((r) =>
    table.fields
      .map((f) => {
        const val = formatCellValue(f, r.cells[f.id]);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [header, ...rows].join('\r\n');
};

/**
 * Download CSV file for Google Sheets
 */
export const downloadCSV = (table: DatabaseTable) => {
  const csvContent = '\uFEFF' + generateCSV(table); // UTF-8 BOM
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${table.name.replace(/\s+/g, '_')}_Google_Sheets.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Copy Tab-Separated Values (TSV) to clipboard for 1-click paste into Google Sheets
 */
export const copyForGoogleSheets = async (table: DatabaseTable): Promise<boolean> => {
  try {
    const header = table.fields.map((f) => f.name).join('\t');
    const rows = table.rows.map((r) =>
      table.fields.map((f) => formatCellValue(f, r.cells[f.id]).replace(/\t/g, ' ')).join('\t')
    );
    const tsv = [header, ...rows].join('\n');
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch (err) {
    console.error('Failed to copy TSV:', err);
    return false;
  }
};

/**
 * Generate rich HTML content suitable for pasting or exporting to Google Docs
 */
export const generateGoogleDocsHTML = (table: DatabaseTable): string => {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableHeaderHtml = table.fields
    .map((f) => `<th style="border: 1px solid #334155; padding: 8px 12px; background-color: #f1f5f9; text-align: left; font-weight: bold;">${f.name}</th>`)
    .join('');

  const tableRowsHtml = table.rows
    .map((row, idx) => {
      const cellsHtml = table.fields
        .map((f) => {
          const val = formatCellValue(f, row.cells[f.id]);
          return `<td style="border: 1px solid #334155; padding: 8px 12px; vertical-align: top;">${val || '—'}</td>`;
        })
        .join('');
      return `<tr><td style="border: 1px solid #334155; padding: 8px 12px; text-align: center; color: #64748b;">${idx + 1}</td>${cellsHtml}</tr>`;
    })
    .join('');

  const detailedRecordsHtml = table.rows
    .map((row, idx) => {
      const primaryField = table.fields[0];
      const primaryVal = primaryField ? formatCellValue(primaryField, row.cells[primaryField.id]) : `Entri #${idx + 1}`;

      const fieldsListHtml = table.fields
        .slice(1)
        .map((f) => {
          const val = formatCellValue(f, row.cells[f.id]);
          return `<div style="margin-bottom: 6px;"><strong>${f.name}:</strong> <span>${val || '—'}</span></div>`;
        })
        .join('');

      return `
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #ffffff;">
          <h3 style="margin-top: 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            ${idx + 1}. ${primaryVal || `Entri #${idx + 1}`}
          </h3>
          ${fieldsListHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.6;">
      <h1 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 4px;">
        ${table.emoji} Laporan Database: ${table.name}
      </h1>
      <p style="color: #64748b; font-size: 13px; margin-top: 0;">
        Terintegrasi dengan Google Docs & Google Sheets | Dibuat pada: ${dateStr}
      </p>
      ${table.description ? `<p style="font-style: italic; color: #475569;">${table.description}</p>` : ''}

      <h2 style="color: #334155; margin-top: 24px;">I. Ikhtisar Data (Tabel Spreadsheet)</h2>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px;">
        <thead>
          <tr>
            <th style="border: 1px solid #334155; padding: 8px 12px; background-color: #f1f5f9; text-align: center; width: 40px;">#</th>
            ${tableHeaderHtml}
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <h2 style="color: #334155; margin-top: 32px;">II. Lembar Rincian Catatan Dokumen (GDocs)</h2>
      ${detailedRecordsHtml}
    </div>
  `;
};

/**
 * Copy rich formatted document HTML to clipboard for pasting directly into Google Docs
 */
export const copyForGoogleDocs = async (table: DatabaseTable): Promise<boolean> => {
  try {
    const html = generateGoogleDocsHTML(table);
    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([table.rows.map((r, i) => `${i + 1}. ${formatCellValue(table.fields[0], r.cells[table.fields[0]?.id])}`).join('\n')], { type: 'text/plain' });

    if (navigator.clipboard && (window as any).ClipboardItem) {
      const item = new (window as any).ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      await navigator.clipboard.writeText(html);
      return true;
    }
  } catch (err) {
    console.error('Failed to copy to Google Docs clipboard:', err);
    return false;
  }
};

/**
 * Download HTML document report
 */
export const downloadHTMLDocument = (table: DatabaseTable) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${table.name} - Google Docs Report</title></head><body style="background:#f8fafc; padding: 2rem;">${generateGoogleDocsHTML(table)}</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${table.name.replace(/\s+/g, '_')}_Google_Docs_Report.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
