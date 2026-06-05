import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Indicadores } from './pages/Indicadores';
import { PainelIntegrado } from './pages/PainelIntegrado';
import { Importacao } from './pages/Importacao';
import { Relatorios } from './pages/Relatorios';

type Page = 'dashboard' | 'painel' | 'indicadores' | 'relatorios' | 'importacao';

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  return (
    <Layout page={page} onPageChange={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'painel' && <PainelIntegrado />}
      {page === 'indicadores' && <Indicadores />}
      {page === 'relatorios' && <Relatorios />}
      {page === 'importacao' && <Importacao />}
    </Layout>
  );
}
