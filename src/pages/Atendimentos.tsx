import { atendimentos } from '../data/mockData';

export function Atendimentos() {
  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Atendimentos</span><h1>Atendimentos consolidados</h1></div></header>
      <section className="chart-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID do atendimento</th><th>ID da pessoa</th><th>Nome ou identificação</th><th>Data do atendimento</th><th>Serviço</th><th>Projeto</th><th>Unidade</th><th>Território</th><th>Cidade</th><th>Tipo de deficiência</th><th>Grau</th><th>Profissional responsável</th><th>Origem da fonte</th><th>Status de validação</th></tr></thead>
            <tbody>{atendimentos.map((item) => <tr key={item.id}><td>{item.idAtendimento}</td><td>{item.idPessoa}</td><td>{item.nomePessoa}</td><td>{item.dataAtendimento}</td><td>{item.servico}</td><td>{item.projeto}</td><td>{item.unidade}</td><td>{item.territorio}</td><td>{item.cidade}</td><td>{item.tipoDeficiencia}</td><td>{item.grau}</td><td>{item.profissionalResponsavel}</td><td>{item.origemFonte}</td><td>{item.statusValidacao}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
