type Props = { mensagem: string; tipo?: 'sucesso' | 'erro' | 'info' };
export function Toast({ mensagem, tipo = 'info' }: Props) {
  if (!mensagem) return null;
  return <p className={`status toast ${tipo}`}>{mensagem}</p>;
}
