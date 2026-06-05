import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '../components/ChartCard';
import { MetricCard } from '../components/MetricCard';
import { fetchIndicatorData } from '../lib/data';
import type { IndicatorFilters } from '../lib/types';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { useMemo, useState } from 'react';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Indicadores() {
  const [filters, setFilters] = useState<IndicatorFilters>({});
  const { data, loading, error } = useSupabaseQuery(() => fetchIndicatorData(filters), [JSON.stringify(filters)]);
  const totals = useMemo(() => {
    const impacto = data?.impacto ?? [];
    const recursos = data?.recursos ?? [];
    return {
      pessoas: impacto.reduce((sum, row) => sum + row.pessoas_atendidas, 0),
      atendimentos: impacto.reduce((sum, row) => sum + row.atendimentos_realizados, 0),
      atividades: impacto.reduce((sum, row) => sum + row.atividades_realizadas, 0),
      frequencia: impacto.length ? Math.round(impacto.reduce((sum, row) => sum + row.frequencia_media, 0) / impacto.length) : 0,
      recursos: recursos.reduce((sum, row) => sum + row.valor_executado, 0),
    };
  }, [data]);

  function update(key: keyof IndicatorFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Ciência de Dados</span><h1>Painel consolidado LGPD-safe</h1></div></header>
      <section className="filters">
        {(['ano', 'mes', 'projeto_id', 'cidade', 'polo', 'modalidade', 'patrocinador', 'fonte_recurso'] as const).map((key) => (
          <label key={key}>{key.replace('_', ' ')}<input placeholder="Todos" onChange={(event) => update(key, event.target.value)} /></label>
        ))}
      </section>
      {loading && <p className="status">Carregando indicadores...</p>}
      {error && <p className="status error">Erro: {error}</p>}
      <section className="metric-grid">
        <MetricCard label="Pessoas atendidas" value={totals.pessoas} />
        <MetricCard label="Atendimentos realizados" value={totals.atendimentos} />
        <MetricCard label="Atividades realizadas" value={totals.atividades} />
        <MetricCard label="Frequência média" value={`${totals.frequencia}%`} />
        <MetricCard label="Recursos executados" value={money.format(totals.recursos)} />
      </section>
      <section className="charts-grid two">
        <ChartCard title="Impacto por território" hasData={Boolean(data?.impacto.length)}>
          <ResponsiveContainer height={320}><BarChart data={data?.impacto}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="cidade" /><YAxis /><Tooltip /><Bar dataKey="pessoas_atendidas" fill="#1d4ed8" /><Bar dataKey="atividades_realizadas" fill="#38bdf8" /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Recursos por projeto" hasData={Boolean(data?.recursos.length)}>
          <ResponsiveContainer height={320}><BarChart data={data?.recursos}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="projeto" /><YAxis /><Tooltip formatter={(value) => money.format(Number(value))} /><Bar dataKey="valor_executado" fill="#0f766e" /></BarChart></ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}
