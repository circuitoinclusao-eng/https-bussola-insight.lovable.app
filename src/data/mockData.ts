import type { Atendimento, Atendido, FontePlanilha, LogProcessamento, MapeamentoColuna, Projeto, RegistroAtendimento } from '../types';
import { calcularFaixaEtaria } from '../lib/normalizacao';

export const cidades = ['Contagem', 'João Monlevade', 'Betim', 'Ribeirão das Neves', 'Candeias', 'Sumaré', 'Belo Horizonte'];
export const projetosNomes = ['Circuito nas Escolas', 'Atletismo Inclusivo', 'Skate Inclusão', 'Minas Power Soccer', 'Capoeira Inclusiva', 'Polo Candeias', 'Projeto Bússola'];
export const servicos = ['Atletismo Inclusivo', 'Skate Inclusivo', 'Power Soccer', 'Capoeira Inclusiva', 'Teatro Inclusão', 'Atendimento familiar', 'Oficina pedagógica', 'Acompanhamento social'];
export const tiposDeficiencia = ['Física', 'Intelectual', 'Visual', 'Auditiva', 'Psicossocial', 'Múltipla', 'Transtorno do Espectro Autista', 'Não informado'];
export const graus = ['Leve', 'Moderado', 'Grave/Severo', 'Não informado'] as const;
export const sexos = ['Feminino', 'Masculino', 'Não informado'] as const;
export const faixasEtarias = ['0 a 12 anos', '13 a 17 anos', '18 a 29 anos', '30 a 59 anos', '60+'];
export const unidades = ['Unidade Contagem', 'Unidade Monlevade', 'Unidade Betim', 'Unidade Neves', 'Unidade Candeias', 'Unidade Sumaré', 'Unidade BH'];
export const territorios = ['Metropolitano', 'Médio Piracicaba', 'Oeste', 'Norte RMBH', 'Bahia', 'Interior SP', 'Capital'];

export const fontesPlanilha: FontePlanilha[] = [
  { id: 'fonte-1', nome: 'Base Bússola - atendimentos 2026', tipo: 'Excel', dataImportacao: '2026-05-28', status: 'Processada', observacoes: 'Consolidação mensal simulada.', ultimoProcessamento: '2026-05-28T10:30:00', totalRegistros: 86, totalErros: 4 },
  { id: 'fonte-2', nome: 'Planilha projetos inclusivos', tipo: 'CSV', dataImportacao: '2026-05-20', status: 'Com alerta', observacoes: 'Campos de grau incompletos em parte dos registros.', ultimoProcessamento: '2026-05-20T15:10:00', totalRegistros: 44, totalErros: 6 },
  { id: 'fonte-3', nome: 'Atendidos por unidade', tipo: 'Vinculação Supabase', dataImportacao: '2026-06-01', status: 'Importada', observacoes: 'Fonte preparada para processamento.', ultimoProcessamento: '2026-06-01T08:45:00', totalRegistros: 120, totalErros: 0 },
];

export const projetos: Projeto[] = projetosNomes.map((nome, index) => ({
  id: `projeto-${index + 1}`,
  nome,
  cidade: cidades[index % cidades.length],
  unidade: unidades[index % unidades.length],
  servico: servicos[index % servicos.length],
  publicoAtendido: 'Pessoas com deficiência, familiares e comunidade escolar',
  status: index === 5 ? 'Encerrado' : 'Ativo',
  dataInicio: `2025-${String((index % 9) + 1).padStart(2, '0')}-05`,
  dataFim: index === 5 ? '2026-03-30' : '',
  fonteRecurso: index % 2 ? 'Patrocínio incentivado' : 'Recurso próprio / parceiros',
  responsavelTecnico: `Responsável técnico ${index + 1}`,
}));

export const registrosAtendimento: RegistroAtendimento[] = Array.from({ length: 86 }, (_, index) => {
  const pessoa = (index % 62) + 1;
  const idade = [8, 14, 22, 34, 47, 63, 17, 29, 55, 11][index % 10];
  const cidade = cidades[index % cidades.length];
  const projeto = projetosNomes[(index + 2) % projetosNomes.length];
  const statusValidacao = index % 23 === 0 ? 'Duplicado' : index % 17 === 0 ? 'Incompleto' : index % 11 === 0 ? 'Alerta' : 'Válido';
  return {
    id: `registro-${index + 1}`,
    idRegistro: `ATD-${String(index + 1).padStart(4, '0')}`,
    idPessoa: `P-${String(pessoa).padStart(4, '0')}`,
    nomePessoa: `Pessoa simulada ${pessoa}`,
    dataAtendimento: `2026-${String((index % 6) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
    tipoDeficiencia: tiposDeficiencia[index % tiposDeficiencia.length],
    grau: graus[index % graus.length],
    unidade: unidades[index % unidades.length],
    territorio: territorios[index % territorios.length],
    servico: servicos[(index + 1) % servicos.length],
    projeto,
    sexo: sexos[index % sexos.length],
    idade,
    faixaEtaria: calcularFaixaEtaria(idade),
    cidade,
    origemFonte: fontesPlanilha[index % fontesPlanilha.length].nome,
    statusValidacao,
  };
});

export const atendidos: Atendido[] = Array.from(new Map(registrosAtendimento.map((registro) => [registro.idPessoa, registro])).values()).map((registro, index) => ({
  id: `atendido-${index + 1}`,
  idPessoa: registro.idPessoa,
  nome: registro.nomePessoa,
  dataNascimento: `${2026 - registro.idade}-01-15`,
  idade: registro.idade,
  faixaEtaria: registro.faixaEtaria,
  sexo: registro.sexo,
  tipoDeficiencia: registro.tipoDeficiencia,
  grau: registro.grau,
  cidade: registro.cidade,
  territorio: registro.territorio,
  unidade: registro.unidade,
  projeto: registro.projeto,
  servico: registro.servico,
  status: index % 9 === 0 ? 'Acompanhamento' : 'Ativo',
}));

export const atendimentos: Atendimento[] = registrosAtendimento.map((registro, index) => ({
  id: `atendimento-${index + 1}`,
  idAtendimento: registro.idRegistro,
  idPessoa: registro.idPessoa,
  nomePessoa: registro.nomePessoa,
  dataAtendimento: registro.dataAtendimento,
  servico: registro.servico,
  projeto: registro.projeto,
  unidade: registro.unidade,
  territorio: registro.territorio,
  cidade: registro.cidade,
  tipoDeficiencia: registro.tipoDeficiencia,
  grau: registro.grau,
  profissionalResponsavel: `Profissional ${String.fromCharCode(65 + (index % 8))}`,
  origemFonte: registro.origemFonte,
  statusValidacao: registro.statusValidacao,
}));

export const logsProcessamento: LogProcessamento[] = [
  { id: 'log-1', dataHora: '2026-05-28T10:30:00', fonte: fontesPlanilha[0].nome, status: 'Sucesso', mensagem: 'Registros consolidados com regras de limpeza e duplicidade.', linhasProcessadas: 86, quantidadeErros: 4 },
  { id: 'log-2', dataHora: '2026-05-20T15:10:00', fonte: fontesPlanilha[1].nome, status: 'Com alerta', mensagem: 'Grau e tipo de deficiência ausentes em algumas linhas.', linhasProcessadas: 44, quantidadeErros: 6 },
  { id: 'log-3', dataHora: '2026-06-01T08:45:00', fonte: fontesPlanilha[2].nome, status: 'Importada', mensagem: 'Fonte vinculada e aguardando confirmação de processamento.', linhasProcessadas: 120, quantidadeErros: 0 },
];

export const mapeamentosColunas: MapeamentoColuna[] = ['Identificador do atendimento', 'ID da pessoa', 'Nome da pessoa', 'Data do atendimento', 'Tipo de deficiência', 'Grau', 'Unidade', 'Território', 'Serviço', 'Projeto', 'Sexo', 'Faixa etária', 'Idade', 'Cidade', 'Origem da fonte'].map((campo, index) => ({
  id: `map-${index + 1}`,
  fonteId: 'fonte-1',
  colunaOriginal: ['id_atendimento', 'codigo_pessoa', 'participante', 'data', 'deficiencia', 'grau', 'unidade', 'territorio', 'servico', 'projeto', 'sexo', 'faixa', 'idade', 'municipio', 'origem'][index],
  campoPadrao: campo,
  obrigatorio: index < 10,
}));
