// Utility to print Salary Slip (Slip Gaji) with Kelana Logo and Official Corporate Layout
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function printSalarySlip(slip: {
  employeeName: string;
  employeeNik: string;
  division: string;
  position: string;
  period: string;
  basicSalary: number;
  allowances: number;
  attendanceDeductions: number;
  taxPPH21: number;
  netSalary: number;
  paymentStatus: string;
  employeeSignature?: string; // Tanda tangan digital PNG pegawai
}) {
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalEarnings = slip.basicSalary + slip.allowances;
  const totalDeductions = slip.attendanceDeductions + slip.taxPPH21;
  const docNumber = `SLP/KC/${slip.employeeNik}/${slip.period.replace(/\s+/g, '-').toUpperCase()}`;

  // Create an invisible iframe for pristine PDF printing without app UI overhead
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
    <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Slip_Gaji_${slip.employeeName}_${slip.period}.pdf</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .slip-wrapper {
            max-width: 780px;
            margin: 0 auto;
            border: 1.5px solid #059669;
            border-radius: 12px;
            padding: 24px;
            background: #ffffff;
            box-shadow: none;
          }
          .header-table {
            width: 100%;
            border-bottom: 2.5px solid #059669;
            padding-bottom: 16px;
            margin-bottom: 18px;
          }
          .logo-container {
            width: 70px;
            vertical-align: middle;
          }
          .logo-img {
            width: 60px;
            height: 60px;
            object-fit: contain;
            border-radius: 8px;
          }
          .company-info {
            vertical-align: middle;
            padding-left: 14px;
          }
          .company-title {
            font-size: 20px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
            letter-spacing: -0.3px;
          }
          .company-sub {
            font-size: 11px;
            font-weight: 700;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 2px 0 0 0;
          }
          .company-addr {
            font-size: 10px;
            color: #6b7280;
            margin-top: 3px;
          }
          .doc-badge-cell {
            text-align: right;
            vertical-align: top;
          }
          .doc-badge {
            display: inline-block;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
          }
          .doc-num {
            font-size: 10px;
            font-family: monospace;
            color: #6b7280;
            margin-top: 4px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 3px 0;
            font-size: 12px;
          }
          .info-label {
            color: #64748b;
            width: 140px;
          }
          .info-val {
            color: #0f172a;
            font-weight: 600;
          }
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .col-section {
            width: 50%;
            vertical-align: top;
          }
          .col-section:first-child {
            padding-right: 14px;
          }
          .col-section:last-child {
            padding-left: 14px;
            border-left: 1px dashed #cbd5e1;
          }
          .sec-header {
            font-size: 12px;
            font-weight: 700;
            padding-bottom: 6px;
            margin-bottom: 8px;
            border-bottom: 1.5px solid #cbd5e1;
          }
          .sec-earnings {
            color: #047857;
            border-color: #a7f3d0;
          }
          .sec-deductions {
            color: #be123c;
            border-color: #fecdd3;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 12px;
          }
          .item-row.total-row {
            border-top: 1px solid #e2e8f0;
            margin-top: 6px;
            padding-top: 6px;
            font-weight: 700;
          }
          .thp-box {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 1.5px solid #34d399;
            border-radius: 8px;
            padding: 14px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .thp-title {
            font-size: 13px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
          }
          .thp-sub {
            font-size: 10px;
            color: #047857;
            margin-top: 2px;
          }
          .thp-amount {
            font-size: 22px;
            font-weight: 900;
            color: #047857;
            letter-spacing: -0.5px;
          }
          .sign-table {
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
          }
          .sign-cell {
            width: 50%;
            text-align: center;
            font-size: 11px;
            color: #475569;
          }
          .sign-space {
            height: 60px;
          }
          .sign-name {
            font-weight: 700;
            color: #0f172a;
            text-decoration: underline;
          }
          .stamp-box {
            display: inline-block;
            border: 1px solid #10b981;
            padding: 2px 8px;
            border-radius: 4px;
            color: #059669;
            font-size: 9px;
            font-weight: 700;
            margin-top: 3px;
          }
          .footer-note {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #f1f5f9;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="slip-wrapper">
          <!-- Kop Surat & Logo -->
          <table class="header-table">
            <tr>
              <td class="logo-container">
                <img src="/kelana-logo.png" alt="Logo Kelana" class="logo-img" onerror="this.src='/favicon.svg'" />
              </td>
              <td class="company-info">
                <h1 class="company-title">Kelana Corporate</h1>
                <p class="company-sub">Slip Gaji Karyawan Resmi (Confidential)</p>
                <div class="company-addr">Ruang Kelana ERP Workspace • Gedung Kelana Tower Lantai 8, Jakarta Selatan</div>
              </td>
              <td class="doc-badge-cell">
                <div class="doc-badge">STATUS: TERBAYAR LUNAS</div>
                <div class="doc-num">${docNumber}</div>
              </td>
            </tr>
          </table>

          <!-- Identitas Pegawai -->
          <div class="info-box">
            <table class="info-table">
              <tr>
                <td class="info-label">Nama Karyawan</td>
                <td class="info-val">: ${slip.employeeName}</td>
                <td class="info-label">Periode Penggajian</td>
                <td class="info-val" style="color: #059669;">: ${slip.period}</td>
              </tr>
              <tr>
                <td class="info-label">Nomor Induk (NIK)</td>
                <td class="info-val">: ${slip.employeeNik}</td>
                <td class="info-label">Departemen / Divisi</td>
                <td class="info-val">: ${slip.division}</td>
              </tr>
              <tr>
                <td class="info-label">Jabatan</td>
                <td class="info-val">: ${slip.position}</td>
                <td class="info-label">Metode Pembayaran</td>
                <td class="info-val">: Transfer Bank (BCA Payroll)</td>
              </tr>
            </table>
          </div>

          <!-- Rincian Gaji (Pemasukan vs Potongan) -->
          <table class="breakdown-table">
            <tr>
              <!-- Kolom A: Penghasilan -->
              <td class="col-section">
                <div class="sec-header sec-earnings">A. PENGHASILAN (EARNINGS)</div>
                <div class="item-row">
                  <span>Gaji Pokok:</span>
                  <span style="font-weight: 600;">${formatIDR(slip.basicSalary)}</span>
                </div>
                <div class="item-row">
                  <span>Tunjangan Operasional:</span>
                  <span style="font-weight: 600;">${formatIDR(slip.allowances)}</span>
                </div>
                <div class="item-row total-row" style="color: #047857;">
                  <span>Total Penghasilan (Bruto):</span>
                  <span>${formatIDR(totalEarnings)}</span>
                </div>
              </td>

              <!-- Kolom B: Potongan -->
              <td class="col-section">
                <div class="sec-header sec-deductions">B. POTONGAN (DEDUCTIONS)</div>
                <div class="item-row">
                  <span>Potongan Absensi / Alpa:</span>
                  <span style="color: #be123c; font-weight: 600;">-${formatIDR(slip.attendanceDeductions)}</span>
                </div>
                <div class="item-row">
                  <span>Pajak PPh 21 Ditanggung:</span>
                  <span style="color: #be123c; font-weight: 600;">-${formatIDR(slip.taxPPH21)}</span>
                </div>
                <div class="item-row total-row" style="color: #be123c;">
                  <span>Total Potongan:</span>
                  <span>-${formatIDR(totalDeductions)}</span>
                </div>
              </td>
            </tr>
          </table>

          <!-- Total Gaji Bersih (Take Home Pay) -->
          <div class="thp-box">
            <div>
              <div class="thp-title">GAJI BERSIH DITERIMA (TAKE HOME PAY)</div>
              <div class="thp-sub">Telah diposting ke General Ledger & Rekening Payroll Karyawan</div>
            </div>
            <div class="thp-amount">${formatIDR(slip.netSalary)}</div>
          </div>

          <!-- Tanda Tangan Otorisasi -->
          <table class="sign-table">
            <tr>
              <td class="sign-cell">
                <p>Penerima (Karyawan),</p>
                <div class="sign-space" style="display:flex; align-items:center; justify-content:center;">
                  ${slip.employeeSignature ? `<img src="${slip.employeeSignature}" style="max-height:55px; max-width:160px; object-fit:contain;" alt="TTD Karyawan" />` : ''}
                </div>
                <p class="sign-name">${slip.employeeName}</p>
                <div style="font-size: 10px; color: #64748b;">NIK: ${slip.employeeNik}</div>
              </td>
              <td class="sign-cell">
                <p>Jakarta, ${format(new Date(), 'd MMMM yyyy', { locale: idLocale })}</p>
                <p>Finance & Payroll Department,</p>
                <div class="sign-space" style="display:flex; align-items:center; justify-content:center;">
                  <div class="stamp-box">VERIFIED BY KELANA FINANCE</div>
                </div>
                <p class="sign-name">Budi Santoso, S.E., M.Ak.</p>
                <div style="font-size: 10px; color: #64748b;">Head of Finance & Treasury</div>
              </td>
            </tr>
          </table>

          <!-- Catatan Kaki Dokumen -->
          <div class="footer-note">
            Dokumen ini dicetak otomatis melalui Sistem ERP Keuangan Ruang Kelana Corporate. Bukti resmi yang sah tanpa memerlukan tanda tangan basah fisik.
          </div>
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
  }, 400);
}
