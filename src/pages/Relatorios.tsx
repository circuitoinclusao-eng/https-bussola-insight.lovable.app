import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { MetricCard } from '../components/MetricCard';
import { FiltrosGerenciais } from '../components/shared/FiltrosGerenciais';
import { Toast } from '../components/shared/Toast';
import { registrosAtendimento } from '../data/mockData';
import { agruparPor, contarPessoasUnicas, evolucaoMensalPorGrau, filtrarRegistros, resumoPorGrau } from '../lib/consolidacao';
import { exportarCSV, exportarExcel, exportarPDF, imprimirRelatorio } from '../lib/exportacao';
import type { ExportRow } from '../lib/exportacao';
import type { FiltrosGerenciais as Filtros } from '../types';

const colors = ['#1d4ed8', '#0f766e', '#f97316', '#64748b', '#7c3aed'];
const secoes = ['Relatório por tipo de deficiência', 'Relatório por idade/faixa etária', 'Relatório por sexo', 'Relatório por cidade', 'Relatório por unidade', 'Relatório por serviço', 'Relatório por projeto', 'Relatório de inconsistências'];
const unique = (campo: keyof typeof registrosAtendimento[number]) => Array.from(new Set(registrosAtendimento.map((item) => String(item[campo])))).sort();

export function Relatorios() {
  const [filtros, setFiltros] = useState<Filtros>({});
  const [toast, setToast] = useState('');
  const filtrados = useMemo(() => filtrarRegistros(registrosAtendimento, filtros), [filtros]);
  const resumo = useMemo(() => resumoPorGrau(filtrados), [filtrados]);
  const opcoes = useMemo(() => ({ projeto: unique('projeto'), unidade: unique('unidade'), cidade: unique('cidade'), territorio: unique('territorio'), servico: unique('servico'), tipoDeficiencia: unique('tipoDeficiencia'), grau: unique('grau'), sexo: unique('sexo'), faixaEtaria: unique('faixaEtaria') }), []);
  const total = contarPessoasUnicas(filtrados);
  const totalGrau = (grau: string) => resumo.find((item) => item.nome === grau)?.total ?? 0;
  const tabela: ExportRow[] = resumo.map((item) => ({ Grau: item.nome, 'Quantidade de pessoas': item.total, Percentual: `${item.percentual ?? 0}%`, 'Quantidade de atendimentos': item.atendimentos, 'Tipos de deficiência mais frequentes': item.tiposFrequentes, 'Cidades com maior concentração': item.cidadesConcentracao, 'Serviços mais acessados': item.servicosAcessados }));
  const exportar = (acao: () => string) => setToast(acao());

  return (
    <div className="page-stack report-page">
      <header className="page-header"><div><span>Relatórios</span><h1>Relatório de quantidade de pessoas com deficiência atendidas e o grau</h1></div><strong>Gerencial • exportável • filtrável</strong></header>
      <Toast mensagem={toast} tipo="sucesso" />
      <FiltrosGerenciais filtros={filtros} opcoes={opcoes} onChange={setFiltros} />
      <section className="actions"><button onClick={() => exportar(() => exportarPDF(tabela, 'relatorio-pessoas-deficiencia-grau'))}>Exportar relatório em PDF</button><button onClick={() => exportar(() => exportarExcel(tabela, 'relatorio-pessoas-deficiencia-grau'))}>Exportar dados em Excel</button><button onClick={() => exportar(() => exportarCSV(tabela, 'relatorio-pessoas-deficiencia-grau'))}>Exportar dados em CSV</button><button onClick={() => exportar(imprimirRelatorio)}>Imprimir relatório</button></section>
      <section className="metric-grid"><MetricCard label="Total de pessoas com deficiência atendidas" value={total} /><MetricCard label="Total grau leve" value={totalGrau('Leve')} /><MetricCard label="Total grau moderado" value={totalGrau('Moderado')} /><MetricCard label="Total grau grave/severo" value={totalGrau('Grave/Severo')} /><MetricCard label="Total não informado" value={totalGrau('Não informado')} /><MetricCard label="Percentual com grau informado" value={`${total ? Math.round(((total - totalGrau('Não informado')) / total) * 100) : 0}%`} /></section>
      <section className="charts-grid">
        <ChartCard title="Quantidade de pessoas atendidas por grau" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={resumo}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#1d4ed8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Percentual por grau" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><PieChart><Pie data={resumo} dataKey="total" nameKey="nome" innerRadius={58} outerRadius={96} label>{resumo.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Evolução mensal por grau" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><LineChart data={evolucaoMensalPorGrau(filtrados)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="Leve" stroke="#1d4ed8" /><Line dataKey="Moderado" stroke="#0f766e" /><Line dataKey="Grave/Severo" stroke="#f97316" /><Line dataKey="Não informado" stroke="#64748b" /></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Tipo de deficiência por grau" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'tipoDeficiencia')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" angle={-20} height={70} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#7c3aed" /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Pessoas atendidas por cidade" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'cidade')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#38bdf8" /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Pessoas atendidas por faixa etária" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'faixaEtaria')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#16a34a" /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Pessoas atendidas por sexo" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'sexo')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#f97316" /></BarChart></ResponsiveContainer></ChartCard>
      </section>
      <section className="chart-card"><h2>Tabela resumida por grau</h2><div className="table-wrap"><table><thead><tr>{Object.keys(tabela[0] ?? { Grau: '' }).map((coluna) => <th key={coluna}>{coluna}</th>)}</tr></thead><tbody>{tabela.map((linha) => <tr key={String(linha.Grau)}>{Object.values(linha).map((valor, index) => <td key={index}>{String(valor)}</td>)}</tr>)}</tbody></table></div></section>
      <section className="tabs-grid">{secoes.map((secao) => <article className="chart-card" key={secao}><h3>{secao}</h3><p>Seção preparada para detalhar os dados consolidados com os mesmos filtros gerenciais.</p></article>)}</section>
    </div>
  );
}
