/**
 * PDF Generation Service
 * Generates PM inspection reports as HTML → PDF
 */

import RNHTMLtoPDF, { generatePDF } from 'react-native-html-to-pdf';
import { formatDate, formatDateTime, getStatusColor } from '../utils/helpers';

interface PDFInspectionData {
  inspectorName: string;
  inspectionDate: number;
  type: string;
  notes: string;
  asset: {
    assetCode: string;
    name: string;
    category: string;
    location: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    specifications: Record<string, string>;
  };
  items: {
    label: string;
    value: string;
    unit: string;
    status: string;
    notes: string;
    type: string;
  }[];
  photosPaths: string[];
  signaturePath: string;
  companyName: string;
}

/**
 * Generate PDF report from inspection data
 */
export async function generateInspectionPDF(
  data: PDFInspectionData,
): Promise<string> {
  const html = buildHTMLReport(data);

  const options = {
    html,
    fileName: `PM_Report_${data.asset.assetCode}_${Date.now()}`,
    directory: 'docs', // Changed from Documents to avoid hang on Android 10+
    base64: false,
    height: 842,
    width: 595,
    padding: 0,
  };

  let file: any;
  if (typeof generatePDF === 'function') {
    file = await generatePDF(options as any);
  } else if (RNHTMLtoPDF && typeof RNHTMLtoPDF.convert === 'function') {
    file = await RNHTMLtoPDF.convert(options);
  } else {
    throw new Error('Modul HTML to PDF tidak ditemukan');
  }
  return file?.filePath || '';
}

/**
 * Build HTML template for the PM report
 */
function buildHTMLReport(data: PDFInspectionData): string {
  const inspectionTypeLabels: Record<string, string> = {
    preventive: 'Preventive Maintenance',
    corrective: 'Corrective Maintenance',
    predictive: 'Predictive Maintenance',
  };

  const categoryLabels: Record<string, string> = {
    hvac: 'HVAC',
    cooling: 'Sistem Pendingin',
    electrical: 'Kelistrikan',
    plumbing: 'Plumbing',
    other: 'Lainnya',
  };

  // Count statuses
  const statusCounts = {
    ok: data.items.filter(i => i.status === 'ok').length,
    warning: data.items.filter(i => i.status === 'warning').length,
    critical: data.items.filter(i => i.status === 'critical').length,
    na: data.items.filter(i => i.status === 'na').length,
  };

  const specsHtml = Object.entries(data.asset.specifications)
    .map(
      ([key, val]) =>
        `<tr><td style="color:#7F8C9B;padding:4px 8px;">${key}</td><td style="padding:4px 8px;font-weight:500;">${val}</td></tr>`,
    )
    .join('');

  const checklistRowsHtml = data.items
    .map((item, index) => {
      const statusColor = getStatusColor(item.status);
      const statusLabel =
        item.status === 'ok'
          ? 'OK'
          : item.status === 'warning'
          ? 'PERHATIAN'
          : item.status === 'critical'
          ? 'KRITIS'
          : 'N/A';

      let displayValue = item.value;
      if (item.type === 'pass_fail') {
        displayValue = item.value === 'true' ? 'PASS ✓' : 'FAIL ✗';
      }
      if (item.unit) {
        displayValue = `${item.value} ${item.unit}`;
      }

      return `
        <tr style="border-bottom:1px solid #2A3A4A;">
          <td style="padding:10px 12px;color:#7F8C9B;width:30px;">${
            index + 1
          }</td>
          <td style="padding:10px 12px;">${item.label}</td>
          <td style="padding:10px 12px;text-align:center;font-weight:500;">${displayValue}</td>
          <td style="padding:10px 12px;text-align:center;">
            <span style="background:${statusColor}20;color:${statusColor};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">
              ${statusLabel}
            </span>
          </td>
          <td style="padding:10px 12px;color:#7F8C9B;font-size:11px;">${
            item.notes || '-'
          }</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background: #0F1923;
          color: #ECF0F1;
          font-size: 12px;
          line-height: 1.5;
        }
        .page {
          padding: 32px;
          min-height: 100vh;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #1E3A5F;
        }
        .header-left h1 {
          font-size: 22px;
          color: #ECF0F1;
          margin-bottom: 4px;
        }
        .header-left p {
          color: #7F8C9B;
          font-size: 12px;
        }
        .header-right {
          text-align: right;
        }
        .header-right .company {
          font-size: 16px;
          font-weight: 700;
          color: #3498DB;
        }
        .header-right .date {
          color: #7F8C9B;
          font-size: 11px;
          margin-top: 4px;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #3498DB;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #1E3A5F;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .info-item {
          background: #1A2A3A;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .info-label {
          font-size: 10px;
          color: #7F8C9B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .info-value {
          font-size: 13px;
          font-weight: 500;
          color: #ECF0F1;
        }
        .summary-grid {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .summary-card {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .summary-card .count {
          font-size: 28px;
          font-weight: 700;
        }
        .summary-card .label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: #1A2A3A;
          border-radius: 8px;
          overflow: hidden;
        }
        thead tr {
          background: #142840;
        }
        thead th {
          padding: 10px 12px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #7F8C9B;
          font-weight: 600;
        }
        tbody td {
          font-size: 12px;
        }
        .notes-box {
          background: #1A2A3A;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
          min-height: 60px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #1E3A5F;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .signature-box {
          text-align: center;
        }
        .signature-line {
          width: 180px;
          border-bottom: 1px solid #7F8C9B;
          margin-bottom: 6px;
          padding-bottom: 40px;
        }
        .generated-at {
          color: #4A5568;
          font-size: 9px;
          text-align: right;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <h1>📋 Laporan ${inspectionTypeLabels[data.type] || data.type}</h1>
            <p>${categoryLabels[data.asset.category] || data.asset.category}</p>
          </div>
          <div class="header-right">
            <div class="company">${data.companyName || 'CMMS Report'}</div>
            <div class="date">${formatDate(data.inspectionDate)}</div>
          </div>
        </div>

        <!-- Asset Information -->
        <div class="section">
          <div class="section-title">Informasi Aset</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Kode Aset</div>
              <div class="info-value">${data.asset.assetCode}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Nama Aset</div>
              <div class="info-value">${data.asset.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Lokasi</div>
              <div class="info-value">${data.asset.location}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Manufacturer</div>
              <div class="info-value">${data.asset.manufacturer}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Model</div>
              <div class="info-value">${data.asset.model}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Serial Number</div>
              <div class="info-value">${data.asset.serialNumber}</div>
            </div>
          </div>
          ${
            specsHtml
              ? `
            <table style="margin-top:10px;">
              <thead><tr><th>Spesifikasi</th><th>Nilai</th></tr></thead>
              <tbody>${specsHtml}</tbody>
            </table>`
              : ''
          }
        </div>

        <!-- Inspection Info -->
        <div class="section">
          <div class="section-title">Informasi PM</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Teknisi</div>
              <div class="info-value">${data.inspectorName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tanggal</div>
              <div class="info-value">${formatDate(data.inspectionDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tipe</div>
              <div class="info-value">${
                inspectionTypeLabels[data.type] || data.type
              }</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total Item</div>
              <div class="info-value">${data.items.length} item</div>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="section">
          <div class="section-title">Ringkasan Hasil</div>
          <div class="summary-grid">
            <div class="summary-card" style="background:rgba(46,204,113,0.1);">
              <div class="count" style="color:#2ECC71;">${statusCounts.ok}</div>
              <div class="label" style="color:#2ECC71;">OK</div>
            </div>
            <div class="summary-card" style="background:rgba(243,156,18,0.1);">
              <div class="count" style="color:#F39C12;">${
                statusCounts.warning
              }</div>
              <div class="label" style="color:#F39C12;">Perhatian</div>
            </div>
            <div class="summary-card" style="background:rgba(231,76,60,0.1);">
              <div class="count" style="color:#E74C3C;">${
                statusCounts.critical
              }</div>
              <div class="label" style="color:#E74C3C;">Kritis</div>
            </div>
            <div class="summary-card" style="background:rgba(127,140,155,0.1);">
              <div class="count" style="color:#7F8C9B;">${statusCounts.na}</div>
              <div class="label" style="color:#7F8C9B;">N/A</div>
            </div>
          </div>
        </div>

        <!-- Checklist Results -->
        <div class="section">
          <div class="section-title">Hasil Checklist</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th style="text-align:center;">Nilai</th>
                <th style="text-align:center;">Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${checklistRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Notes -->
        ${
          data.notes
            ? `
        <div class="section">
          <div class="section-title">Catatan / Remarks</div>
          <div class="notes-box">${data.notes}</div>
        </div>`
            : ''
        }

        <!-- Footer with Signature -->
        <div class="footer">
          <div>
            <div style="color:#7F8C9B;font-size:10px;">Dokumen ini dibuat secara digital</div>
            <div style="color:#7F8C9B;font-size:10px;">oleh aplikasi CMMS Maintenance</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="font-weight:600;">${data.inspectorName}</div>
            <div style="color:#7F8C9B;font-size:10px;">Teknisi</div>
          </div>
        </div>

        <div class="generated-at">
          Dibuat pada: ${formatDateTime(Date.now())}
        </div>
      </div>
    </body>
    </html>
  `;
}

export default { generateInspectionPDF };
