import { BarChart3, DatabaseZap, FileText, LayoutDashboard, UploadCloud } from 'lucide-react';
import type { ReactNode } from 'react';

type Page = 'dashboard' | 'painel' | 'indicadores' | 'relatorios' | 'importacao';

type LayoutProps = { page: Page; onPageChange: (page: Page) => void; children: ReactNode };

const nav = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { id: 'painel' as const, label: 'Painel Integrado', icon: LayoutDashboard },
  { id: 'indicadores' as const, label: 'Indicadores', icon: DatabaseZap },
  { id: 'relatorios' as const, label: 'Relatórios', icon: FileText },
  { id: 'importacao' as const, label: 'Importação', icon: UploadCloud },
];

export function Layout({ page, onPageChange, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CI</div>
          <div>
            <strong>Circuito Conecta</strong>
            <span>Padrão Bússola</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button className={page === item.id ? 'active' : ''} key={item.id} onClick={() => onPageChange(item.id)}>
                <Icon size={18} /> {item.label}
              </button>
            );
          })}
        </nav>
        <footer>Dados reais Supabase • LGPD-safe</footer>
      </aside>
      <main>{children}</main>
    </div>
  );
}
