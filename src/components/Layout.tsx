import { BarChart3, DatabaseZap, FileText, FolderKanban, HeartHandshake, LayoutDashboard, Settings, UploadCloud, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Page } from '../App';

type LayoutProps = { page: Page; onPageChange: (page: Page) => void; children: ReactNode };

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'importacao', label: 'Importação', icon: UploadCloud },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'atendidos', label: 'Atendidos', icon: Users },
  { id: 'atendimentos', label: 'Atendimentos', icon: HeartHandshake },
  { id: 'administracao', label: 'Administração', icon: Settings },
  { id: 'painel', label: 'Painel Integrado', icon: LayoutDashboard },
  { id: 'indicadores', label: 'Indicadores', icon: DatabaseZap },
] satisfies Array<{ id: Page; label: string; icon: typeof BarChart3 }>;

export function Layout({ page, onPageChange, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">BI</div>
          <div><strong>Bússola Inclusiva</strong><span>Bússola Insight</span></div>
        </div>
        <nav>{nav.map((item) => { const Icon = item.icon; return <button className={page === item.id ? 'active' : ''} key={item.id} onClick={() => onPageChange(item.id)}><Icon size={18} /> {item.label}</button>; })}</nav>
        <footer>Dados simulados seguros • Supabase opcional • LGPD</footer>
      </aside>
      <main>{children}</main>
    </div>
  );
}
