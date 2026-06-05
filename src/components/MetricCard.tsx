type MetricCardProps = { label: string; value: string | number; helper?: string; loading?: boolean; error?: string | null };

export function MetricCard({ label, value, helper, loading = false, error = null }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      {loading && <strong>Carregando...</strong>}
      {!loading && error && <strong className="metric-error">Erro</strong>}
      {!loading && !error && <strong>{value}</strong>}
      {helper && <small>{helper}</small>}
      {!loading && error && <small>{error}</small>}
    </article>
  );
}
