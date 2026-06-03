export type DashboardMetric = {
  total_projetos: number;
  total_pessoas: number;
  total_atividades: number;
  total_grupos: number;
  editais_abertos: number;
  atendimentos_hoje: number;
  vagas_ofertadas: number;
  vagas_disponiveis: number;
  frequencia_media: number;
  taxa_ocupacao: number;
  evasao: number;
  permanencia: number;
  valor_aprovado: number;
  valor_executado: number;
  saldo: number;
};

export type NamedValue = { nome: string; total: number };
export type MonthlyValue = { mes: string; total: number };
export type FrequencyByProject = { projeto: string; frequencia_media: number; presentes: number; faltas: number; justificativas: number };
export type OccupationByGroup = { grupo: string; projeto: string; vagas: number; ocupados: number; taxa_ocupacao: number };
export type ResourceByProject = { projeto: string; fonte_recurso: string; valor_aprovado: number; valor_executado: number; saldo: number };
export type ImpactRow = { cidade: string; pessoas_atendidas: number; atendimentos_realizados: number; atividades_realizadas: number; frequencia_media: number; recursos_executados: number };

export type DashboardData = {
  metrics: DashboardMetric | null;
  atividadesMensais: MonthlyValue[];
  projetosStatus: NamedValue[];
  pessoasCidade: NamedValue[];
  frequenciaProjeto: FrequencyByProject[];
  atendimentosTipo: NamedValue[];
  ocupacaoGrupo: OccupationByGroup[];
};

export type IndicatorFilters = {
  ano?: string;
  mes?: string;
  projeto_id?: string;
  cidade?: string;
  polo?: string;
  modalidade?: string;
  patrocinador?: string;
  fonte_recurso?: string;
};

export type ReportRow = Record<string, string | number | null>;

export type IntegratedPanelFilters = {
  ano?: string;
  mes?: string;
  projeto?: string;
  cidade?: string;
  polo?: string;
  modalidade?: string;
  patrocinador?: string;
};

export type IntegratedCountRow = {
  projeto_id: string;
  projeto: string;
  cidade: string;
  polo: string | null;
  modalidade: string | null;
  patrocinador: string | null;
  ano?: number;
  mes?: number;
  total: number;
};

export type IntegratedGroupRow = {
  projeto_id: string;
  projeto: string;
  cidade: string;
  polo: string | null;
  modalidade: string | null;
  patrocinador: string | null;
  total_grupos: number;
  vagas: number;
  ocupados: number;
  taxa_ocupacao: number;
  ano?: number;
  mes?: number;
};

export type IntegratedConditionRow = IntegratedCountRow & { grau_condicao: string };
export type IntegratedFrequencyRow = Omit<IntegratedCountRow, 'total'> & { frequencia_media: number; presentes: number; faltas: number; justificativas: number };
export type IntegratedOccupationRow = IntegratedGroupRow & { grupo: string };
export type IntegratedProjectStatusRow = IntegratedCountRow & { status: string };

export type IntegratedPanelData = {
  pessoas: IntegratedCountRow[];
  atendimentos: IntegratedCountRow[];
  atividades: IntegratedCountRow[];
  grupos: IntegratedGroupRow[];
  condicoes: IntegratedConditionRow[];
  frequencias: IntegratedFrequencyRow[];
  ocupacao: IntegratedOccupationRow[];
  projetosStatus: IntegratedProjectStatusRow[];
};
