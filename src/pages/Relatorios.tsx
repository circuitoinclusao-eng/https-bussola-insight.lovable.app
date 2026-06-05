import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { exportExcel, exportPdf } from '../lib/exporters';
import { fetchReport } from '../lib/data';
import type { ReportRow } from '../lib/types';

const reportTypes = ['semanal', 'mensal', 'projeto', 'atividades', 'frequencia', 'impacto', 'patrocinador', 'prestacao_contas'];

export function Relatorios() {
  const [tipo, setTipo] = useState('mensal');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [status, setStatus] = useState('');

  async function load(formData: FormData) {
    setStatus('Carregando relatório automático...');
    try {
      const result = await fetchReport(tipo, {
        projeto_id: String(formData.get('projeto') ?? ''),
        cidade: String(formData.get('cidade') ?? ''),
        inicio: String(formData.get('inicio') ?? ''),
        fim: String(formData.get('fim') ?? ''),
      });
      setRows(result);
      setStatus(result.length ? 'Relatório carregado com dados reais.' : 'Sem dados cadastrados');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Erro ao carregar relatório');
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Relatórios</span><h1>Relatórios automáticos e exportáveis</h1></div></header>
      <form className="filters" action={load}>
        <label>Tipo<select value={tipo} onChange={(event) => setTipo(event.target.value)}>{reportTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Projeto<input name="projeto" placeholder="todos" /></label>
        <label>Cidade<input name="cidade" placeholder="todas" /></label>
        <label>Início<input name="inicio" type="date" /></label>
        <label>Fim<input name="fim" type="date" /></label>
        <button type="submit">Gerar</button>
      </form>
      <div className="actions"><button onClick={() => exportPdf(rows, `relatorio-${tipo}`)}>Exportar PDF</button><button onClick={() => exportExcel(rows, `relatorio-${tipo}`)}>Exportar Excel</button></div>
      {status && <p className="status">{status}</p>}
      {rows.length ? <pre className="report-preview">{JSON.stringify(rows, null, 2)}</pre> : <EmptyState title="Sem dados cadastrados" action="Gere um relatório após cadastrar projeto, atividade, frequência ou atendimento." />}
    </div>
  );
}
