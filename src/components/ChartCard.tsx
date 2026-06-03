import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

type ChartCardProps = {
  title: string;
  hasData: boolean;
  children: ReactNode;
  emptyText?: string;
  loading?: boolean;
  error?: string | null;
};

export function ChartCard({
  title,
  hasData,
  children,
  emptyText = 'Nenhuma atividade registrada no período',
  loading = false,
  error = null,
}: ChartCardProps) {
  return (
    <section className="chart-card">
      <h3>{title}</h3>
      {loading && <p className="status">Carregando dados agregados...</p>}
      {!loading && error && <p className="status error">Erro ao carregar gráfico: {error}</p>}
      {!loading && !error && (hasData ? children : <EmptyState title="Sem dados cadastrados" action={emptyText} />)}
    </section>
  );
}
