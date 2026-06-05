import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ReportRow } from './types';

export function exportExcel(rows: ReportRow[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportPdf(rows: ReportRow[], filename: string) {
  const doc = new jsPDF();
  const headers = rows.length ? Object.keys(rows[0]) : ['mensagem'];
  const body = rows.length ? rows.map((row) => headers.map((header) => String(row[header] ?? ''))) : [['Sem dados cadastrados']];
  doc.text('Circuito Conecta - Relatório', 14, 16);
  autoTable(doc, { head: [headers], body, startY: 24, styles: { fontSize: 8 } });
  doc.save(`${filename}.pdf`);
}
