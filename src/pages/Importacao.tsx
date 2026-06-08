import * as XLSX from 'xlsx';
import { useMemo, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Toast } from '../components/shared/Toast';
import { fontesPlanilha, mapeamentosColunas, registrosAtendimento } from '../data/mockData';
import { calcularResumoConsolidacao, consolidarRegistros } from '../lib/consolidacao';
import type { RegistroAtendimento } from '../types';

type LinhaPlanilha = Record<string, unknown>;
const camposPadrao = ['Identificador do atendimento', 'ID da pessoa', 'Nome da pessoa', 'Data do atendimento', 'Tipo de deficiência', 'Grau', 'Unidade', 'Território', 'Serviço', 'Projeto', 'Sexo', 'Faixa etária', 'Idade', 'Cidade', 'Origem da fonte'];
const etapas = ['Upload ou vinculação da fonte', 'Mapeamento de colunas', 'Validação', 'Consolidação', 'Confirmação'];

export function Importacao() {
  const [etapa, setEtapa] = useState(0);
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>(registrosAtendimento.slice(0, 10) as unknown as LinhaPlanilha[]);
  const [toast, setToast] = useState('');
  const resumo = useMemo(() => calcularResumoConsolidacao(registrosAtendimento), []);

  async function lerArquivo(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    setLinhas(XLSX.utils.sheet_to_json<LinhaPlanilha>(worksheet).slice(0, 10));
    setEtapa(1);
    setToast('Arquivo lido com sucesso. Revise o mapeamento de colunas.');
  }

  function consolidar() {
    consolidarRegistros(registrosAtendimento as RegistroAtendimento[]);
    setEtapa(4);
    setToast('Dados consolidados com sucesso.');
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Importação Bússola</span><h1>Fluxo de importação, validação e consolidação</h1></div><strong>CSV ou Excel • simulação segura</strong></header>
      <Toast mensagem={toast} tipo="sucesso" />
      <section className="steps">{etapas.map((item, index) => <button key={item} className={index === etapa ? 'active' : ''} onClick={() => setEtapa(index)}>{index + 1}. {item}</button>)}</section>
      <section className="import-layout">
        <article className="import-card upload-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void lerArquivo(file); }}>
          <UploadCloud size={42} />
          <h2>Upload ou vinculação da fonte</h2>
          <p>Arraste uma planilha Excel/CSV do Bússola ou selecione um arquivo local. Quando não houver arquivo, a prévia usa dados simulados.</p>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => event.target.files?.[0] && void lerArquivo(event.target.files[0])} />
        </article>
        <article className="import-card">
          <h2>Fontes importadas</h2>
          {fontesPlanilha.map((fonte) => <div className="source-row" key={fonte.id}><strong>{fonte.nome}</strong><span>{fonte.tipo} • {fonte.status} • {fonte.totalRegistros} registros • {fonte.totalErros} erros</span></div>)}
        </article>
      </section>
      <section className="chart-card"><h2>Mapeamento de colunas original → campo padrão</h2><div className="mapping-grid">{mapeamentosColunas.map((mapa, index) => <label key={mapa.id}>{mapa.colunaOriginal}<select defaultValue={mapa.campoPadrao}>{camposPadrao.map((campo) => <option key={campo}>{campo}</option>)}</select><small>{mapa.obrigatorio ? 'Obrigatório' : 'Opcional'} • linha {index + 1}</small></label>)}</div></section>
      <section className="charts-grid two">
        <article className="chart-card"><h2>Prévia das 10 primeiras linhas</h2><div className="table-wrap"><table><thead><tr>{Object.keys(linhas[0] ?? {}).slice(0, 8).map((coluna) => <th key={coluna}>{coluna}</th>)}</tr></thead><tbody>{linhas.map((linha, index) => <tr key={index}>{Object.keys(linha).slice(0, 8).map((coluna) => <td key={coluna}>{String(linha[coluna] ?? '')}</td>)}</tr>)}</tbody></table></div></article>
        <article className="chart-card"><h2>Resumo de validação</h2><div className="validation-grid"><Metric label="Linhas válidas" value={resumo.linhasValidas} /><Metric label="Linhas com alerta" value={resumo.linhasComAlerta} /><Metric label="Linhas incompletas" value={resumo.linhasIncompletas} /><Metric label="Possíveis duplicidades" value={resumo.possiveisDuplicidades} /><Metric label="Campos não reconhecidos" value={resumo.camposNaoReconhecidos} /></div><ul className="alerts"><li>Registro sem pessoa identificada</li><li>Registro sem data ou data inválida</li><li>Registro sem grau, tipo de deficiência, unidade ou serviço</li><li>Possível duplicidade por ID da pessoa ou nome + data + serviço</li></ul><button className="primary" onClick={consolidar}>Consolidar dados</button></article>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="mini-metric"><strong>{value}</strong><span>{label}</span></div>; }
