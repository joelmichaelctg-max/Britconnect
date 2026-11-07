import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportToExcel(filename: string, sheets: { sheetName: string; data: Record<string, any>[] }[]) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToJson(filename: string, data: any) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

export async function exportElementToPdf(elementId: string, filename: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found for PDF export.`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Header Navy Bar
    pdf.setFillColor(11, 31, 58); // #0B1F3A
    pdf.rect(0, 0, pdfWidth, 22, 'F');

    // Gold Accent Rule
    pdf.setFillColor(201, 162, 39); // #C9A227
    pdf.rect(0, 22, pdfWidth, 1.5, 'F');

    // Title Text
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('BRITCONNECT AI CUSTOMER CHURN INTELLIGENCE', 14, 11);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(224, 187, 74); // Gold light
    pdf.text(`REPORT: ${title.toUpperCase()}`, 14, 18);

    // Generation Metadata
    pdf.setFontSize(8);
    pdf.setTextColor(200, 210, 225);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    pdf.text(`Generated: ${dateStr} | Confidential`, pdfWidth - 60, 15);

    // Image Content
    const imgWidth = pdfWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const maxHeightPerPage = pdfHeight - 34;

    if (imgHeight <= maxHeightPerPage) {
      pdf.addImage(imgData, 'PNG', 10, 28, imgWidth, imgHeight);
    } else {
      // Split over pages
      let heightLeft = imgHeight;
      let position = 28;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= maxHeightPerPage;

      while (heightLeft > 0) {
        pdf.addPage();
        position = -pdfHeight + 25 + (imgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= maxHeightPerPage;
      }
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error('Error generating PDF report:', err);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
