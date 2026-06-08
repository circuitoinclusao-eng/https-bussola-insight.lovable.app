import { fontesPlanilha, logsProcessamento } from '../data/mockData';

export function Administracao() {
  const configs = ['Critério de duplicidade principal: ID da pessoa + nome/data/serviço', 'Padronização automática de grau', 'Padronização automática de cidade', 'Exigir data de atendimento', 'Permitir registro sem sexo', 'Permitir registro sem idade', 'Exibir registros incompletos no relatório'];
  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Administração</span><h1>Fontes, logs e configurações de consolidação</h1></div></header>
      <section className="chart-card">
        <h2>Fontes de dados</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome da fonte</th><th>Tipo</th><th>Data de importação</th><th>Último processamento</th><th>Status</th><th>Quantidade de registros</th><th>Quantidade de erros</th><th>Ações</th></tr></thead>
            <tbody>{fontesPlanilha.map((fonte) => <tr key={fonte.id}><td>{fonte.nome}</td><td>{fonte.tipo}</td><td>{fonte.dataImportacao}</td><td>{fonte.ultimoProcessamento}</td><td>{fonte.status}</td><td>{fonte.totalRegistros}</td><td>{fonte.totalErros}</td><td><div className="table-actions"><button>Processar</button><button>Ver logs</button></div></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="chart-card">
        <h2>Logs de processamento</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data e hora</th><th>Fonte</th><th>Status</th><th>Mensagem</th><th>Linhas processadas</th><th>Quantidade de erros</th></tr></thead>
            <tbody>{logsProcessamento.map((log) => <tr key={log.id}><td>{log.dataHora}</td><td>{log.fonte}</td><td>{log.status}</td><td>{log.mensagem}</td><td>{log.linhasProcessadas}</td><td>{log.quantidadeErros}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="chart-card">
        <h2>Configurações de consolidação</h2>
        <div className="config-grid">{configs.map((config, index) => <label key={config}><input type="checkbox" defaultChecked={index < 4 || index === 6} />{config}</label>)}</div>
      </section>
    </div>
  );
}
