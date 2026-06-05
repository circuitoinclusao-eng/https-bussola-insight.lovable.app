import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import { fetchDashboardData } from '../lib/data';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';

const colors = ['#1d4ed8', '#2563eb', '#38bdf8', '#0f766e', '#7c3aed', '#f97316'];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Dashboard() {
  const { data, loading, error } = useSupabaseQuery(fetchDashboardData, []);

  if (!isSupabaseConfigured) return <EmptyState title="Supabase não configurado" action="Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para carregar dados reais." />;
  if (loading) return <p className="status">Carregando dados reais do Supabase...</p>;
  if (error) return <p className="status error">Erro ao carregar dashboard: {error}</p>;

  const metrics = data?.metrics;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span>Dashboard principal</span>
          <h1>Operação integrada Circuito Conecta</h1>
        </div>
        <strong>cadastro → atividade → frequência → atendimento → relatório → indicador</strong>
      </header>

      <section className="metric-grid">
        <MetricCard label="Projetos" value={metrics?.total_projetos ?? 0} helper="Total de projetos reais" />
        <MetricCard label="Pessoas" value={metrics?.total_pessoas ?? 0} helper="Atendidos agregados" />
        <MetricCard label="Atividades" value={metrics?.total_atividades ?? 0} helper="Registros de atividades" />
        <MetricCard label="Grupos" value={metrics?.total_grupos ?? 0} helper="Turmas cadastradas" />
        <MetricCard label="Editais Abertos" value={metrics?.editais_abertos ?? 0} helper="Oportunidades abertas" />
        <MetricCard label="Atendimentos Hoje" value={metrics?.atendimentos_hoje ?? 0} helper="Individual/familiar" />
      </section>

      <section className="metric-grid compact">
        <MetricCard label="Frequência média" value={`${metrics?.frequencia_media ?? 0}%`} />
        <MetricCard label="Taxa de ocupação" value={`${metrics?.taxa_ocupacao ?? 0}%`} />
        <MetricCard label="Permanência" value={`${metrics?.permanencia ?? 0}%`} />
        <MetricCard label="Saldo" value={money.format(metrics?.saldo ?? 0)} />
      </section>

      <section className="charts-grid">
        <ChartCard title="Atividades por mês" hasData={Boolean(data?.atividadesMensais.length)}>
          <ResponsiveContainer height={260}><LineChart data={data?.atividadesMensais}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={3} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Projetos por status" hasData={Boolean(data?.projetosStatus.length)}>
          <ResponsiveContainer height={260}><PieChart><Pie data={data?.projetosStatus} dataKey="total" nameKey="nome" outerRadius={90} label>{data?.projetosStatus.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Pessoas por cidade" hasData={Boolean(data?.pessoasCidade.length)}>
          <ResponsiveContainer height={260}><BarChart data={data?.pessoasCidade}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Frequência por projeto" hasData={Boolean(data?.frequenciaProjeto.length)}>
          <ResponsiveContainer height={260}><BarChart data={data?.frequenciaProjeto}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="projeto" /><YAxis /><Tooltip /><Bar dataKey="frequencia_media" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Atendimentos por tipo" hasData={Boolean(data?.atendimentosTipo.length)}>
          <ResponsiveContainer height={260}><BarChart data={data?.atendimentosTipo}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="#7c3aed" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Ocupação por turma" hasData={Boolean(data?.ocupacaoGrupo.length)}>
          <ResponsiveContainer height={260}><BarChart data={data?.ocupacaoGrupo}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="grupo" /><YAxis /><Tooltip /><Bar dataKey="taxa_ocupacao" fill="#f97316" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}
