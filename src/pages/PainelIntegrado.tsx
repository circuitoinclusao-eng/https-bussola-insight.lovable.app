import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { fetchIntegratedPanelData } from '../lib/data';
import { isSupabaseConfigured } from '../lib/supabase';
import type { IntegratedPanelFilters } from '../lib/types';

const colors = ['#1d4ed8', '#2563eb', '#38bdf8', '#0f766e', '#7c3aed', '#f97316'];
const filterKeys: Array<keyof IntegratedPanelFilters> = ['ano', 'mes', 'projeto', 'cidade', 'polo', 'modalidade', 'patrocinador'];
const filterLabels: Record<keyof IntegratedPanelFilters, string> = {
  ano: 'ano',
  mes: 'mês',
  projeto: 'projeto',
  cidade: 'cidade',
  polo: 'polo',
  modalidade: 'modalidade',
  patrocinador: 'patrocinador',
};

function sumBy<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function groupTotals<T>(rows: T[], label: (row: T) => string, value: (row: T) => number) {
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(label(row), (totals.get(label(row)) ?? 0) + value(row)));
  return Array.from(totals.entries()).map(([nome, total]) => ({ nome, total }));
}

export function PainelIntegrado() {
  const [filters, setFilters] = useState<IntegratedPanelFilters>({});
  const { data, loading, error } = useSupabaseQuery(() => fetchIntegratedPanelData(filters), [JSON.stringify(filters)]);

  const summary = useMemo(() => {
    const frequencias = data?.frequencias ?? [];
    const grupos = data?.grupos ?? [];
    return {
      pessoas: sumBy(data?.pessoas ?? [], (row) => row.total),
      atendimentos: sumBy(data?.atendimentos ?? [], (row) => row.total),
      atividades: sumBy(data?.atividades ?? [], (row) => row.total),
      grupos: sumBy(grupos, (row) => row.total_grupos),
      frequencia: frequencias.length ? Math.round(sumBy(frequencias, (row) => row.frequencia_media) / frequencias.length) : 0,
      ocupacao: grupos.length ? Math.round(sumBy(grupos, (row) => row.taxa_ocupacao) / grupos.length) : 0,
    };
  }, [data]);

  const charts = useMemo(() => ({
    condicoes: groupTotals(data?.condicoes ?? [], (row) => row.grau_condicao, (row) => row.total),
    atividadesMes: groupTotals(data?.atividades ?? [], (row) => `${row.ano}-${String(row.mes).padStart(2, '0')}`, (row) => row.total),
    pessoasCidade: groupTotals(data?.pessoas ?? [], (row) => row.cidade || 'Não informado', (row) => row.total),
    frequenciaProjeto: (data?.frequencias ?? []).map((row) => ({ nome: row.projeto, total: row.frequencia_media })),
    ocupacaoTurma: (data?.ocupacao ?? []).map((row) => ({ nome: row.grupo, total: row.taxa_ocupacao })),
    projetosStatus: groupTotals(data?.projetosStatus ?? [], (row) => row.status, (row) => row.total),
  }), [data]);

  const hasAnyData = Boolean(data && Object.values(data).some((rows) => rows.length > 0));

  function updateFilter(key: keyof IntegratedPanelFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  }

  if (!isSupabaseConfigured) return <EmptyState title="Supabase não configurado" action="Configure o Supabase para visualizar o Painel Integrado com dados reais." />;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span>Painel Integrado</span>
          <h1>Indicadores operacionais agregados</h1>
        </div>
        <strong>Dados agregados, sem CPF, telefone, laudos ou registros individuais</strong>
      </header>

      <section className="filters">
        {filterKeys.map((key) => (
          <label key={key}>{filterLabels[key]}<input placeholder="Todos" onChange={(event) => updateFilter(key, event.target.value)} /></label>
        ))}
      </section>

      {loading && <p className="status">Carregando Painel Integrado com dados reais do Supabase...</p>}
      {error && <p className="status error">Erro ao carregar Painel Integrado: {error}</p>}
      {!loading && !error && !hasAnyData && <EmptyState title="Sem dados cadastrados" action="Cadastre o primeiro projeto ou ajuste os filtros para visualizar indicadores agregados." />}

      <section className="metric-grid">
        <MetricCard label="Pessoas atendidas" value={summary.pessoas} loading={loading} error={error} helper="View agregada vw_painel_pessoas" />
        <MetricCard label="Total de atendimentos" value={summary.atendimentos} loading={loading} error={error} helper="View agregada vw_painel_atendimentos" />
        <MetricCard label="Atividades realizadas" value={summary.atividades} loading={loading} error={error} helper="View agregada vw_painel_atividades" />
        <MetricCard label="Grupos ativos" value={summary.grupos} loading={loading} error={error} helper="View agregada vw_painel_grupos" />
        <MetricCard label="Frequência média" value={`${summary.frequencia}%`} loading={loading} error={error} helper="View agregada vw_painel_frequencia_projeto" />
        <MetricCard label="Taxa de ocupação" value={`${summary.ocupacao}%`} loading={loading} error={error} helper="View agregada vw_painel_grupos" />
      </section>

      <section className="charts-grid">
        <ChartCard title="Atendimentos por grau/condição (agregado)" hasData={Boolean(charts.condicoes.length)} loading={loading} error={error} emptyText="Sem dados agregados de atendimentos no período">
          <ResponsiveContainer height={260}><PieChart><Pie data={charts.condicoes} dataKey="total" nameKey="nome" outerRadius={92} label>{charts.condicoes.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Atividades por mês" hasData={Boolean(charts.atividadesMes.length)} loading={loading} error={error} emptyText="Nenhuma atividade registrada no período">
          <ResponsiveContainer height={260}><BarChart data={charts.atividadesMes}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#1d4ed8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Pessoas por cidade" hasData={Boolean(charts.pessoasCidade.length)} loading={loading} error={error} emptyText="Sem dados cadastrados por cidade">
          <ResponsiveContainer height={260}><BarChart data={charts.pessoasCidade}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Frequência por projeto" hasData={Boolean(charts.frequenciaProjeto.length)} loading={loading} error={error} emptyText="Nenhuma frequência registrada no período">
          <ResponsiveContainer height={260}><BarChart data={charts.frequenciaProjeto}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ocupação por turma" hasData={Boolean(charts.ocupacaoTurma.length)} loading={loading} error={error} emptyText="Sem grupos/turmas cadastrados">
          <ResponsiveContainer height={260}><BarChart data={charts.ocupacaoTurma}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#f97316" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Projetos por status" hasData={Boolean(charts.projetosStatus.length)} loading={loading} error={error} emptyText="Cadastre o primeiro projeto">
          <ResponsiveContainer height={260}><PieChart><Pie data={charts.projetosStatus} dataKey="total" nameKey="nome" outerRadius={92} label>{charts.projetosStatus.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}
