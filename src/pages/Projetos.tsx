import { MetricCard } from '../components/MetricCard';
import { atendidos, atendimentos, projetos } from '../data/mockData';

export function Projetos() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div><span>Projetos</span><h1>Gestão de projetos inclusivos</h1></div>
      </header>
      <section className="metric-grid compact">
        <MetricCard label="Projetos ativos" value={projetos.filter((p) => p.status === 'Ativo').length} />
        <MetricCard label="Projetos encerrados" value={projetos.filter((p) => p.status === 'Encerrado').length} />
        <MetricCard label="Projetos por cidade" value={new Set(projetos.map((p) => p.cidade)).size} />
        <MetricCard label="Total de pessoas vinculadas" value={atendidos.length} />
      </section>
      <section className="chart-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome do projeto</th><th>Cidade</th><th>Unidade</th><th>Serviço</th><th>Público atendido</th><th>Status</th><th>Data de início</th><th>Data de fim</th><th>Fonte de recurso</th><th>Responsável técnico</th><th>Quantidade de atendidos</th><th>Quantidade de atendimentos</th><th>Ações</th></tr></thead>
            <tbody>{projetos.map((projeto) => <tr key={projeto.id}><td>{projeto.nome}</td><td>{projeto.cidade}</td><td>{projeto.unidade}</td><td>{projeto.servico}</td><td>{projeto.publicoAtendido}</td><td>{projeto.status}</td><td>{projeto.dataInicio}</td><td>{projeto.dataFim || 'Em andamento'}</td><td>{projeto.fonteRecurso}</td><td>{projeto.responsavelTecnico}</td><td>{atendidos.filter((a) => a.projeto === projeto.nome).length}</td><td>{atendimentos.filter((a) => a.projeto === projeto.nome).length}</td><td><div className="table-actions"><button>Visualizar</button><button>Editar</button><button>Exportar</button><button>Vincular atendidos</button></div></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
