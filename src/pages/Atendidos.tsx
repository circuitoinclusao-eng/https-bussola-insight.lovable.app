import { atendidos } from '../data/mockData';

export function Atendidos() {
  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Atendidos</span><h1>Pessoas com deficiência atendidas</h1></div></header>
      <p className="status">Utilize dados pessoais apenas quando necessário. Sempre que possível, trabalhe com ID da pessoa para proteger informações sensíveis.</p>
      <section className="chart-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID da pessoa</th><th>Nome</th><th>Data de nascimento</th><th>Idade</th><th>Faixa etária</th><th>Sexo</th><th>Tipo de deficiência</th><th>Grau</th><th>Cidade</th><th>Território</th><th>Unidade</th><th>Projeto vinculado</th><th>Serviço vinculado</th><th>Status</th></tr></thead>
            <tbody>{atendidos.map((item) => <tr key={item.id}><td>{item.idPessoa}</td><td>{item.nome}</td><td>{item.dataNascimento}</td><td>{item.idade}</td><td>{item.faixaEtaria}</td><td>{item.sexo}</td><td>{item.tipoDeficiencia}</td><td>{item.grau}</td><td>{item.cidade}</td><td>{item.territorio}</td><td>{item.unidade}</td><td>{item.projeto}</td><td>{item.servico}</td><td>{item.status}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
