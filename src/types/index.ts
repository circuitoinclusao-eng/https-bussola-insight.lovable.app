export type StatusFonte = 'Importada' | 'Processada' | 'Com alerta' | 'Pendente';
export type StatusValidacao = 'Válido' | 'Alerta' | 'Incompleto' | 'Duplicado';
export type StatusProjeto = 'Ativo' | 'Encerrado' | 'Pausado';
export type GrauDeficiencia = 'Leve' | 'Moderado' | 'Grave/Severo' | 'Não informado';
export type Sexo = 'Feminino' | 'Masculino' | 'Não informado';
export type StatusAtendido = 'Ativo' | 'Inativo' | 'Acompanhamento' | 'Inconsistente' | 'Aguardando revisão' | 'Excluído';

export type FontePlanilha = {
  id: string;
  nome: string;
  tipo: string;
  dataImportacao: string;
  status: StatusFonte;
  observacoes: string;
  ultimoProcessamento: string;
  totalRegistros: number;
  totalErros: number;
};

export type RegistroAtendimento = {
  id: string;
  idRegistro: string;
  idPessoa: string;
  nomePessoa: string;
  dataAtendimento: string;
  tipoDeficiencia: string;
  grau: GrauDeficiencia;
  unidade: string;
  territorio: string;
  servico: string;
  projeto: string;
  sexo: Sexo;
  idade: number;
  faixaEtaria: string;
  cidade: string;
  origemFonte: string;
  statusValidacao: StatusValidacao;
};

export type Projeto = {
  id: string;
  nome: string;
  cidade: string;
  unidade: string;
  servico: string;
  publicoAtendido: string;
  status: StatusProjeto;
  dataInicio: string;
  dataFim: string;
  fonteRecurso: string;
  responsavelTecnico: string;
};

export type Atendido = {
  id: string;
  idPessoa: string;
  nome: string;
  dataNascimento: string;
  idade: number;
  faixaEtaria: string;
  sexo: Sexo;
  tipoDeficiencia: string;
  grau: GrauDeficiencia;
  cidade: string;
  territorio: string;
  unidade: string;
  projeto: string;
  servico: string;
  responsavel: string;
  telefone: string;
  email: string;
  escola: string;
  observacoes: string;
  status: StatusAtendido;
  origemFonte?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  status: 'Ativo' | 'Inativo' | 'Acompanhamento';
};

export type Atendimento = {
  id: string;
  idAtendimento: string;
  idPessoa: string;
  nomePessoa: string;
  dataAtendimento: string;
  servico: string;
  projeto: string;
  unidade: string;
  territorio: string;
  cidade: string;
  tipoDeficiencia: string;
  grau: GrauDeficiencia;
  profissionalResponsavel: string;
  origemFonte: string;
  statusValidacao: StatusValidacao;
};

export type LogProcessamento = {
  id: string;
  dataHora: string;
  fonte: string;
  status: StatusFonte | 'Erro' | 'Sucesso';
  mensagem: string;
  linhasProcessadas: number;
  quantidadeErros: number;
  usuario?: string;
  acao?: string;
  quantidadeRegistrosAfetados?: number;
};

export type MapeamentoColuna = {
  id: string;
  fonteId: string;
  colunaOriginal: string;
  campoPadrao: string;
  obrigatorio: boolean;
};

export type FiltrosGerenciais = {
  inicio?: string;
  fim?: string;
  projeto?: string;
  unidade?: string;
  cidade?: string;
  territorio?: string;
  servico?: string;
  tipoDeficiencia?: string;
  grau?: string;
  sexo?: string;
  faixaEtaria?: string;
};

export type SerieValor = { nome: string; total: number; percentual?: number };
export type ResumoGrau = SerieValor & { atendimentos: number; tiposFrequentes: string; cidadesConcentracao: string; servicosAcessados: string };
