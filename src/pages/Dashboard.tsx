import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { MetricCard } from '../components/MetricCard';
import { FiltrosGerenciais } from '../components/shared/FiltrosGerenciais';
import { fontesPlanilha, projetos, registrosAtendimento } from '../data/mockData';
import { agruparPor, contarPessoasUnicas, evolucaoMensal, filtrarRegistros } from '../lib/consolidacao';
import type { FiltrosGerenciais as Filtros } from '../types';

const colors = ['#1d4ed8', '#0f766e', '#7c3aed', '#f97316', '#38bdf8', '#16a34a', '#dc2626'];
const unique = (campo: keyof typeof registrosAtendimento[number]) => Array.from(new Set(registrosAtendimento.map((item) => String(item[campo])))).sort();

export function Dashboard() {
  const [filtros, setFiltros] = useState<Filtros>({});
  const filtrados = useMemo(() => filtrarRegistros(registrosAtendimento, filtros), [filtros]);
  const opcoes = useMemo(() => ({ projeto: unique('projeto'), unidade: unique('unidade'), cidade: unique('cidade'), territorio: unique('territorio'), servico: unique('servico'), tipoDeficiencia: unique('tipoDeficiencia'), grau: unique('grau'), sexo: unique('sexo'), faixaEtaria: unique('faixaEtaria') }), []);
  const ultimaImportacao = [...fontesPlanilha].sort((a, b) => b.dataImportacao.localeCompare(a.dataImportacao))[0];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div><span>Dashboard principal</span><h1>Bússola Inclusiva — visão gerencial consolidada</h1></div>
        <strong>Dados simulados LGPD-safe • fallback automático sem Supabase</strong>
      </header>
      <FiltrosGerenciais filtros={filtros} opcoes={opcoes} onChange={setFiltros} />
      <section className="metric-grid">
        <MetricCard label="Total de pessoas com deficiência atendidas" value={contarPessoasUnicas(filtrados)} helper="Pessoas únicas por ID" />
        <MetricCard label="Total de atendimentos registrados" value={filtrados.length} helper="Linhas consolidadas" />
        <MetricCard label="Total de projetos ativos" value={projetos.filter((projeto) => projeto.status === 'Ativo').length} helper="Carteira atual" />
        <MetricCard label="Total de cidades atendidas" value={new Set(filtrados.map((item) => item.cidade)).size} helper="Municípios filtrados" />
        <MetricCard label="Registros com inconsistência" value={filtrados.filter((item) => item.statusValidacao !== 'Válido').length} helper="Alertas, incompletos e duplicados" />
        <MetricCard label="Última importação realizada" value={ultimaImportacao.dataImportacao} helper={ultimaImportacao.nome} />
      </section>
      <section className="charts-grid">
        <ChartCard title="Distribuição por grau" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><PieChart><Pie data={agruparPor(filtrados, 'grau')} dataKey="total" nameKey="nome" innerRadius={58} outerRadius={96} label>{agruparPor(filtrados, 'grau').map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Pessoas por tipo de deficiência" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'tipoDeficiencia')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" angle={-20} height={70} interval={0} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#1d4ed8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Evolução mensal de atendimentos" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><LineChart data={evolucaoMensal(filtrados)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={3} /></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Pessoas por cidade" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'cidade')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" angle={-15} height={60} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#7c3aed" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Distribuição por sexo" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'sexo')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#f97316" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Distribuição por faixa etária" hasData={filtrados.length > 0}><ResponsiveContainer height={280}><BarChart data={agruparPor(filtrados, 'faixaEtaria')}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#38bdf8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      </section>
    </div>
  );
}
