import { useState } from 'react';
import { Layout } from './components/Layout';
import { Administracao } from './pages/Administracao';
import { Atendimentos } from './pages/Atendimentos';
import { Atendidos } from './pages/Atendidos';
import { Dashboard } from './pages/Dashboard';
import { Importacao } from './pages/Importacao';
import { Indicadores } from './pages/Indicadores';
import { PainelIntegrado } from './pages/PainelIntegrado';
import { Projetos } from './pages/Projetos';
import { Relatorios } from './pages/Relatorios';

export type Page = 'dashboard' | 'painel' | 'indicadores' | 'relatorios' | 'importacao' | 'projetos' | 'atendidos' | 'atendimentos' | 'administracao';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  return (
    <Layout page={page} onPageChange={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'painel' && <PainelIntegrado />}
      {page === 'indicadores' && <Indicadores />}
      {page === 'relatorios' && <Relatorios />}
      {page === 'importacao' && <Importacao />}
      {page === 'projetos' && <Projetos />}
      {page === 'atendidos' && <Atendidos />}
      {page === 'atendimentos' && <Atendimentos />}
      {page === 'administracao' && <Administracao />}
    </Layout>
  );
}
