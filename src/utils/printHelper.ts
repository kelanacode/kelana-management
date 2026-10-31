// Helper for robust, clean printing across all modules (Notes, Database, Wiki)
// Isolates only the document canvas and opens a pristine print window so
// no app layout, sidebars, headers, or hidden scroll wrappers can push the content down.

export function printDocumentCanvas(title: string = 'Dokumen') {
  const canvas = document.querySelector('.doc-page-canvas') as HTMLElement | null;
  if (!canvas) {
    window.print();
    return;
  }

  // Clone canvas content
  const clone = canvas.cloneNode(true) as HTMLElement;

  // Remove any interactive UI elements in the clone
  clone.querySelectorAll('.page-break-badge, .page-break-counter, button').forEach((el) => el.remove());

  // Replace page-break-divider with clean CSS page break
  clone.querySelectorAll('.page-break-divider').forEach((divider) => {
    (divider as HTMLElement).style.cssText = 'page-break-after: always; break-after: page; height: 0; margin: 0; padding: 0; border: none; background: transparent;';
  });

  // Collect all stylesheets from current document
  let styles = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    styles += node.outerHTML;
  });

  // Create an invisible iframe for pristine printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            margin: 15mm 15mm 15mm 15mm;
            size: auto;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            width: 100% !important;
            height: auto !important;
          }
          .doc-page-canvas {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            background: #ffffff !important;
            color: #111827 !important;
            transform: none !important;
            display: block !important;
          }
          .ProseMirror {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            outline: none !important;
          }
          .ProseMirror > *:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          /* Table Print Fixes: ensure table borders, headers and backgrounds render flawlessly */
          table {
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            width: 100% !important;
            margin: 1.25rem 0 !important;
            border: 1.5px solid #1e293b !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
            border-top: 1.5px solid #1e293b !important;
            border-bottom: 2px solid #1e293b !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead tr {
            page-break-before: avoid !important;
          }
          th, td {
            border: 1px solid #334155 !important;
            padding: 8px 12px !important;
            text-align: left !important;
            vertical-align: top !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
            border-top: 1.5px solid #1e293b !important;
            border-bottom: 2px solid #1e293b !important;
          }
          th p, td p {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.4 !important;
          }
          tbody tr:first-child td {
            border-top: 1px solid #334155 !important;
          }
          .page-break-divider {
            page-break-after: always !important;
            break-after: page !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
          }
        </style>
      </head>
      <body>
        <div class="doc-page-canvas">
          ${clone.innerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }
  }, 300);
}
