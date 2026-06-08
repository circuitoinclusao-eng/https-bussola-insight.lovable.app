import type { FiltrosGerenciais } from '../../types';

type Props = {
  filtros: FiltrosGerenciais;
  opcoes: Record<string, string[]>;
  onChange: (filtros: FiltrosGerenciais) => void;
};

const campos = [
  ['projeto', 'Projeto'], ['unidade', 'Unidade'], ['cidade', 'Cidade'], ['territorio', 'Território'], ['servico', 'Serviço'],
  ['tipoDeficiencia', 'Tipo de deficiência'], ['grau', 'Grau'], ['sexo', 'Sexo'], ['faixaEtaria', 'Faixa etária'],
] as const;

export function FiltrosGerenciais({ filtros, opcoes, onChange }: Props) {
  const update = (campo: keyof FiltrosGerenciais, valor: string) => onChange({ ...filtros, [campo]: valor || undefined });
  return (
    <section className="filters" aria-label="Filtros gerenciais">
      <label>Período inicial<input type="date" value={filtros.inicio ?? ''} onChange={(event) => update('inicio', event.target.value)} /></label>
      <label>Período final<input type="date" value={filtros.fim ?? ''} onChange={(event) => update('fim', event.target.value)} /></label>
      {campos.map(([campo, rotulo]) => (
        <label key={campo}>{rotulo}<select value={filtros[campo] ?? ''} onChange={(event) => update(campo, event.target.value)}><option value="">Todos</option>{(opcoes[campo] ?? []).map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}</select></label>
      ))}
      <button type="button" onClick={() => onChange({})}>Limpar filtros</button>
    </section>
  );
}
