type EmptyStateProps = { title?: string; action?: string };

export function EmptyState({ title = 'Sem dados cadastrados', action = 'Cadastre o primeiro projeto' }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{action}</span>
    </div>
  );
}
