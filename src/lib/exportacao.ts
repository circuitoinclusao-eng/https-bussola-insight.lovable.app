import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export function exportarPDF(linhas: ExportRow[], nomeArquivo = 'relatorio-bussola') {
  const doc = new jsPDF();
  const colunas = linhas.length ? Object.keys(linhas[0]) : ['Mensagem'];
  const corpo = linhas.length ? linhas.map((linha) => colunas.map((coluna) => String(linha[coluna] ?? ''))) : [['Sem dados para exportar']];
  doc.text('Bússola Inclusiva - Relatório gerencial', 14, 16);
  autoTable(doc, { head: [colunas], body: corpo, startY: 24, styles: { fontSize: 8 } });
  doc.save(`${nomeArquivo}.pdf`);
  return 'Relatório PDF gerado com sucesso.';
}

export function exportarExcel(linhas: ExportRow[], nomeArquivo = 'dados-consolidados') {
  const worksheet = XLSX.utils.json_to_sheet(linhas);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados consolidados');
  XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
  return 'Dados consolidados exportados em Excel.';
}

export function exportarCSV(linhas: ExportRow[], nomeArquivo = 'dados-consolidados') {
  const worksheet = XLSX.utils.json_to_sheet(linhas);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return 'Arquivo CSV exportado com sucesso.';
}

export function imprimirRelatorio() {
  window.print();
  return 'Relatório enviado para impressão.';
}
