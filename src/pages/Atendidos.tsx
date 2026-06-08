import * as XLSX from 'xlsx';
import { useMemo, useState } from 'react';
import { atendidos as mockAtendidos, cidades, graus, projetosNomes, servicos, sexos, tiposDeficiencia, unidades } from '../data/mockData';
import { calcularFaixaEtaria, padronizarGrau, padronizarSexo, padronizarTipoDeficiencia, textoOuNaoInformado } from '../lib/normalizacao';
import { exportarCSV, exportarExcel } from '../lib/exportacao';
import { atualizarAtendido, criarAtendido, deletarAtendido, deletarAtendidosEmMassa, importarAtendidos } from '../lib/supabaseService';
import type { Atendido, GrauDeficiencia, Sexo, StatusAtendido } from '../types';

type FormMode = 'novo' | 'editar' | 'visualizar';
type SortKey = 'nome' | 'cidade' | 'idade' | 'status';
type LinhaPlanilha = Record<string, unknown>;
type CampoImportacao = keyof Pick<Atendido, 'nome' | 'idPessoa' | 'dataNascimento' | 'idade' | 'faixaEtaria' | 'sexo' | 'tipoDeficiencia' | 'grau' | 'cidade' | 'territorio' | 'unidade' | 'projeto' | 'servico' | 'responsavel' | 'telefone' | 'email' | 'escola' | 'observacoes' | 'status' | 'origemFonte' | 'createdAt' | 'updatedAt'>;
type MapeamentoImportacao = Record<string, CampoImportacao | ''>;
type ResumoImportacao = {
  total: number;
  validas: number;
  alertas: number;
  duplicidades: number;
  semNome: number;
  semCidade: number;
  semDeficienciaOuGrau: number;
  telefoneInvalido: number;
};

type FormAtendido = Omit<Atendido, 'id' | 'idade'> & { id?: string; idade: string };

type Confirmacao =
  | { tipo: 'individual'; aluno: Atendido }
  | { tipo: 'massa'; ids: string[] }
  | null;

const statusOptions: StatusAtendido[] = ['Ativo', 'Inativo', 'Inconsistente', 'Aguardando revisão'];
const camposPadrao: Array<{ campo: CampoImportacao | ''; label: string }> = [
  { campo: '', label: 'Ignorar coluna' },
  { campo: 'nome', label: 'Nome completo' },
  { campo: 'idPessoa', label: 'ID da pessoa' },
  { campo: 'dataNascimento', label: 'Data de nascimento' },
  { campo: 'idade', label: 'Idade' },
  { campo: 'faixaEtaria', label: 'Faixa etária' },
  { campo: 'sexo', label: 'Sexo' },
  { campo: 'tipoDeficiencia', label: 'Tipo de deficiência' },
  { campo: 'grau', label: 'Grau' },
  { campo: 'cidade', label: 'Cidade' },
  { campo: 'territorio', label: 'Território/Bairro' },
  { campo: 'unidade', label: 'Unidade' },
  { campo: 'projeto', label: 'Projeto' },
  { campo: 'servico', label: 'Serviço' },
  { campo: 'responsavel', label: 'Responsável' },
  { campo: 'telefone', label: 'Telefone' },
  { campo: 'email', label: 'E-mail' },
  { campo: 'escola', label: 'Escola' },
  { campo: 'observacoes', label: 'Observações' },
  { campo: 'status', label: 'Status' },
  { campo: 'origemFonte', label: 'Origem da fonte' },
  { campo: 'createdAt', label: 'Data de criação' },
  { campo: 'updatedAt', label: 'Data de atualização' },
];

const vazio: FormAtendido = {
  idPessoa: '',
  nome: '',
  dataNascimento: '',
  idade: '',
  faixaEtaria: '',
  sexo: 'Não informado',
  tipoDeficiencia: 'Não informado',
  grau: 'Não informado',
  cidade: '',
  territorio: '',
  unidade: '',
  projeto: '',
  servico: '',
  responsavel: '',
  telefone: '',
  email: '',
  escola: '',
  observacoes: '',
  status: 'Ativo',
  origemFonte: 'Cadastro manual',
};

function calcularIdade(dataNascimento: string) {
  if (!dataNascimento) return '';
  const nascimento = new Date(dataNascimento);
  if (Number.isNaN(nascimento.getTime())) return '';
  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const mes = hoje.getUTCMonth() - nascimento.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoje.getUTCDate() < nascimento.getUTCDate())) idade -= 1;
  return String(Math.max(0, idade));
}

function normalizarBusca(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function reconhecerColuna(coluna: string): CampoImportacao | '' {
  const texto = normalizarBusca(coluna);
  if (texto.includes('cpf')) return '';
  if (['nome', 'aluno', 'participante', 'nome completo'].some((termo) => texto.includes(termo))) return 'nome';
  if (texto.includes('id') || texto.includes('codigo')) return 'idPessoa';
  if (texto.includes('nascimento')) return 'dataNascimento';
  if (texto.includes('idade')) return 'idade';
  if (texto.includes('faixa')) return 'faixaEtaria';
  if (texto.includes('sexo') || texto.includes('genero')) return 'sexo';
  if (['deficiencia', 'diagnostico'].some((termo) => texto.includes(termo))) return 'tipoDeficiencia';
  if (['grau', 'nivel', 'classificacao'].some((termo) => texto.includes(termo))) return 'grau';
  if (texto.includes('cidade') || texto.includes('municipio')) return 'cidade';
  if (texto.includes('territorio') || texto.includes('bairro')) return 'territorio';
  if (texto.includes('unidade')) return 'unidade';
  if (texto.includes('projeto')) return 'projeto';
  if (texto.includes('servico')) return 'servico';
  if (['responsavel', 'mae', 'pai'].some((termo) => texto.includes(termo))) return 'responsavel';
  if (['telefone', 'contato', 'whatsapp'].some((termo) => texto.includes(termo))) return 'telefone';
  if (texto.includes('email') || texto.includes('e-mail')) return 'email';
  if (texto.includes('escola')) return 'escola';
  if (texto.includes('observ')) return 'observacoes';
  if (texto.includes('status')) return 'status';
  if (texto.includes('origem') || texto.includes('fonte')) return 'origemFonte';
  if (texto.includes('created') || texto.includes('criacao') || texto.includes('criado')) return 'createdAt';
  if (texto.includes('updated') || texto.includes('atualizacao') || texto.includes('atualizado')) return 'updatedAt';
  return '';
}

function telefoneValido(telefone: string) {
  if (!telefone) return true;
  return telefone.replace(/\D/g, '').length >= 10;
}

function validarFormulario(form: FormAtendido) {
  return {
    nome: !form.nome.trim(),
    nascimentoOuIdade: !form.dataNascimento && !form.idade,
    cidade: !form.cidade.trim(),
    projetoOuServico: !form.projeto.trim() && !form.servico.trim(),
    deficienciaOuGrau: (!form.tipoDeficiencia || form.tipoDeficiencia === 'Não informado') && (!form.grau || form.grau === 'Não informado'),
  };
}

function temErroFormulario(erros: ReturnType<typeof validarFormulario>) {
  return Object.values(erros).some(Boolean);
}

function montarAtendido(form: FormAtendido): Atendido {
  const idade = Number(form.idade || calcularIdade(form.dataNascimento) || 0);
  return {
    ...form,
    id: form.id ?? `atendido-${Date.now()}`,
    idPessoa: form.idPessoa || `P-${Date.now()}`,
    idade,
    faixaEtaria: form.faixaEtaria || calcularFaixaEtaria(idade),
    updatedAt: new Date().toISOString(),
    createdAt: form.createdAt ?? new Date().toISOString(),
  };
}

function duplicado(aluno: Partial<Atendido>, lista: Atendido[]) {
  const nome = normalizarBusca(aluno.nome ?? '');
  const telefone = (aluno.telefone ?? '').replace(/\D/g, '');
  return lista.some((item) => {
    const mesmoId = Boolean(aluno.idPessoa && item.idPessoa === aluno.idPessoa);
    const mesmoNomeData = Boolean(nome && aluno.dataNascimento && normalizarBusca(item.nome) === nome && item.dataNascimento === aluno.dataNascimento);
    const mesmoNomeTelefone = Boolean(nome && telefone && normalizarBusca(item.nome) === nome && item.telefone.replace(/\D/g, '') === telefone);
    return mesmoId || mesmoNomeData || mesmoNomeTelefone;
  });
}

function linhaParaAtendido(linha: LinhaPlanilha, mapeamento: MapeamentoImportacao, index: number): Atendido {
  const base: Partial<FormAtendido> = { ...vazio, origemFonte: 'Importação por planilha' };
  Object.entries(mapeamento).forEach(([coluna, campo]) => {
    if (!campo) return;
    const valor = textoOuNaoInformado(linha[coluna]);
    if (campo === 'grau') base.grau = padronizarGrau(valor);
    else if (campo === 'sexo') base.sexo = padronizarSexo(valor);
    else if (campo === 'tipoDeficiencia') base.tipoDeficiencia = padronizarTipoDeficiencia(valor);
    else if (campo === 'status') base.status = ['Ativo', 'Inativo', 'Inconsistente', 'Aguardando revisão'].includes(valor) ? valor as StatusAtendido : 'Aguardando revisão';
    else if (campo === 'idade') base.idade = valor === 'Não informado' ? '' : valor;
    else if (campo in base) (base as Record<string, unknown>)[campo] = valor === 'Não informado' ? '' : valor;
  });
  return montarAtendido({ ...vazio, ...base, id: `importado-${Date.now()}-${index}` });
}

function validarImportacao(novos: Atendido[], existentes: Atendido[]): ResumoImportacao {
  const semNome = novos.filter((item) => !item.nome.trim()).length;
  const semCidade = novos.filter((item) => !item.cidade.trim()).length;
  const semDeficienciaOuGrau = novos.filter((item) => item.tipoDeficiencia === 'Não informado' && item.grau === 'Não informado').length;
  const duplicidades = novos.filter((item) => duplicado(item, existentes)).length;
  const telefoneInvalido = novos.filter((item) => !telefoneValido(item.telefone)).length;
  const alertas = semNome + semCidade + semDeficienciaOuGrau + duplicidades + telefoneInvalido;
  return { total: novos.length, validas: Math.max(0, novos.length - alertas), alertas, duplicidades, semNome, semCidade, semDeficienciaOuGrau, telefoneInvalido };
}

export function Atendidos() {
  const [lista, setLista] = useState<Atendido[]>(mockAtendidos.filter((item) => item.status !== 'Excluído'));
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [modalForm, setModalForm] = useState<{ mode: FormMode; form: FormAtendido } | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [erros, setErros] = useState(validarFormulario(vazio));
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ cidade: '', projeto: '', tipoDeficiencia: '', grau: '', status: '' });
  const [ordenacao, setOrdenacao] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'nome', dir: 'asc' });
  const [pagina, setPagina] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [arquivoNome, setArquivoNome] = useState('');
  const [linhasImportacao, setLinhasImportacao] = useState<LinhaPlanilha[]>([]);
  const [mapeamento, setMapeamento] = useState<MapeamentoImportacao>({});
  const [etapaImportacao, setEtapaImportacao] = useState(1);
  const [estrategiaDuplicidade, setEstrategiaDuplicidade] = useState<'ignorar' | 'importar' | 'atualizar'>('ignorar');
  const porPagina = 10;

  const opcoes = useMemo(() => ({
    cidade: Array.from(new Set([...cidades, ...lista.map((item) => item.cidade)].filter(Boolean))).sort(),
    projeto: Array.from(new Set([...projetosNomes, ...lista.map((item) => item.projeto)].filter(Boolean))).sort(),
    tipoDeficiencia: Array.from(new Set([...tiposDeficiencia, ...lista.map((item) => item.tipoDeficiencia)].filter(Boolean))).sort(),
    grau: Array.from(new Set([...graus, ...lista.map((item) => item.grau)].filter(Boolean))).sort(),
    status: Array.from(new Set([...statusOptions, 'Acompanhamento', ...lista.map((item) => item.status)].filter(Boolean))).sort(),
  }), [lista]);

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return lista
      .filter((item) => !item.deletedAt && item.status !== 'Excluído')
      .filter((item) => !termo || normalizarBusca(item.nome).includes(termo))
      .filter((item) => !filtros.cidade || item.cidade === filtros.cidade)
      .filter((item) => !filtros.projeto || item.projeto === filtros.projeto)
      .filter((item) => !filtros.tipoDeficiencia || item.tipoDeficiencia === filtros.tipoDeficiencia)
      .filter((item) => !filtros.grau || item.grau === filtros.grau)
      .filter((item) => !filtros.status || item.status === filtros.status)
      .sort((a, b) => {
        const valorA = a[ordenacao.key];
        const valorB = b[ordenacao.key];
        const resultado = typeof valorA === 'number' && typeof valorB === 'number' ? valorA - valorB : String(valorA).localeCompare(String(valorB));
        return ordenacao.dir === 'asc' ? resultado : -resultado;
      });
  }, [busca, filtros, lista, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);
  const todosMarcados = paginados.length > 0 && paginados.every((item) => selecionados.has(item.id));
  const importadosPreview = useMemo(() => linhasImportacao.map((linha, index) => linhaParaAtendido(linha, mapeamento, index)), [linhasImportacao, mapeamento]);
  const resumoImportacao = useMemo(() => validarImportacao(importadosPreview, lista), [importadosPreview, lista]);

  function abrirNovo() {
    setErros(validarFormulario(vazio));
    setModalForm({ mode: 'novo', form: vazio });
  }

  function abrirEditar(aluno: Atendido, mode: FormMode) {
    setErros(validarFormulario({ ...aluno, idade: String(aluno.idade) }));
    setModalForm({ mode, form: { ...aluno, idade: String(aluno.idade) } });
  }

  async function salvarFormulario() {
    if (!modalForm || modalForm.mode === 'visualizar') return;
    const validacao = validarFormulario(modalForm.form);
    setErros(validacao);
    if (temErroFormulario(validacao)) return;
    const aluno = montarAtendido(modalForm.form);
    if (modalForm.mode === 'novo') {
      await criarAtendido(aluno);
      setLista((atual) => [aluno, ...atual]);
      setToast('Aluno cadastrado com sucesso.');
    } else {
      await atualizarAtendido(aluno.id, aluno);
      setLista((atual) => atual.map((item) => item.id === aluno.id ? aluno : item));
      setToast('Dados do aluno atualizados com sucesso.');
    }
    setModalForm(null);
  }

  async function confirmarExclusao() {
    if (!confirmacao) return;
    if (confirmacao.tipo === 'individual') {
      await deletarAtendido(confirmacao.aluno.id, confirmacao.aluno.nome);
      setLista((atual) => atual.map((item) => item.id === confirmacao.aluno.id ? { ...item, status: 'Excluído', deletedAt: new Date().toISOString() } : item));
      setSelecionados((atual) => { const novo = new Set(atual); novo.delete(confirmacao.aluno.id); return novo; });
      setToast('Aluno excluído com sucesso.');
    } else {
      await deletarAtendidosEmMassa(confirmacao.ids);
      setLista((atual) => atual.map((item) => confirmacao.ids.includes(item.id) ? { ...item, status: 'Excluído', deletedAt: new Date().toISOString() } : item));
      setSelecionados(new Set());
      setToast('Alunos selecionados excluídos com sucesso.');
    }
    setConfirmacao(null);
  }

  function alternarTodos() {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (todosMarcados) paginados.forEach((item) => novo.delete(item.id));
      else paginados.forEach((item) => novo.add(item.id));
      return novo;
    });
  }

  function alternarAluno(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function ordenar(key: SortKey) {
    setOrdenacao((atual) => ({ key, dir: atual.key === key && atual.dir === 'asc' ? 'desc' : 'asc' }));
  }

  async function lerArquivo(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { defval: '' });
    const columns = Object.keys(rows[0] ?? {});
    const autoMap = Object.fromEntries(columns.map((coluna) => [coluna, reconhecerColuna(coluna)])) as MapeamentoImportacao;
    setArquivoNome(file.name);
    setLinhasImportacao(rows);
    setMapeamento(autoMap);
    setEtapaImportacao(2);
  }

  async function confirmarImportacao() {
    let novos = importadosPreview.filter((item) => item.nome.trim() && item.cidade.trim() && (item.tipoDeficiencia !== 'Não informado' || item.grau !== 'Não informado'));
    if (estrategiaDuplicidade === 'ignorar') novos = novos.filter((item) => !duplicado(item, lista));
    if (estrategiaDuplicidade === 'atualizar') {
      const atualizados = lista.map((existente) => {
        const substituto = novos.find((item) => duplicado(item, [existente]));
        return substituto ? { ...existente, ...substituto, id: existente.id, updatedAt: new Date().toISOString() } : existente;
      });
      const realmenteNovos = novos.filter((item) => !duplicado(item, lista));
      setLista([...realmenteNovos, ...atualizados]);
      await importarAtendidos(novos, arquivoNome || 'planilha_sem_nome.xlsx');
    } else {
      setLista((atual) => [...novos, ...atual]);
      await importarAtendidos(novos, arquivoNome || 'planilha_sem_nome.xlsx');
    }
    setToast('Alunos importados com sucesso.');
    setImportOpen(false);
    setEtapaImportacao(1);
    setArquivoNome('');
    setLinhasImportacao([]);
    setMapeamento({});
  }

  function exportarLista(tipo: 'excel' | 'csv') {
    const linhas = filtrados.map((item) => ({ ID: item.idPessoa, Nome: item.nome, Idade: item.idade, Sexo: item.sexo, Deficiência: item.tipoDeficiencia, Grau: item.grau, Cidade: item.cidade, Unidade: item.unidade, Projeto: item.projeto, Responsável: item.responsavel, Telefone: item.telefone, Email: item.email, Escola: item.escola, Observações: item.observacoes, Status: item.status, Origem: item.origemFonte, CriadoEm: item.createdAt, AtualizadoEm: item.updatedAt }));
    if (tipo === 'excel') exportarExcel(linhas, 'lista-atendidos');
    else exportarCSV(linhas, 'lista-atendidos');
    setToast('Lista de alunos exportada com sucesso.');
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Atendidos</span><h1>Gerenciamento de alunos e atendidos</h1></div><strong>{filtrados.length} registros encontrados</strong></header>
      {toast && <p className="status toast sucesso">{toast}</p>}
      <p className="status">Utilize dados pessoais apenas quando necessário. Sempre que possível, trabalhe com ID da pessoa para proteger informações sensíveis.</p>

      <section className="toolbar-card">
        <div className="actions"><button onClick={abrirNovo}>Novo aluno</button><button onClick={() => setImportOpen(true)}>Importar planilha</button><button onClick={() => exportarLista('excel')}>Exportar lista Excel</button><button onClick={() => exportarLista('csv')}>Exportar lista CSV</button><button className="danger" disabled={selecionados.size === 0} onClick={() => setConfirmacao({ tipo: 'massa', ids: Array.from(selecionados) })}>Excluir selecionados</button></div>
        <div className="filters"><label>Buscar por nome<input value={busca} onChange={(event) => { setBusca(event.target.value); setPagina(1); }} placeholder="Digite o nome do aluno" /></label>{(['cidade', 'projeto', 'tipoDeficiencia', 'grau', 'status'] as const).map((campo) => <label key={campo}>{campo === 'tipoDeficiencia' ? 'Deficiência' : campo}<select value={filtros[campo]} onChange={(event) => { setFiltros((atual) => ({ ...atual, [campo]: event.target.value })); setPagina(1); }}><option value="">Todos</option>{opcoes[campo].map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}</select></label>)}</div>
      </section>

      <section className="chart-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th><input type="checkbox" checked={todosMarcados} onChange={alternarTodos} aria-label="Selecionar todos" /></th><th>ID</th><th><button className="sort-button" onClick={() => ordenar('nome')}>Nome</button></th><th><button className="sort-button" onClick={() => ordenar('idade')}>Idade</button></th><th>Sexo</th><th>Tipo de deficiência</th><th>Grau</th><th><button className="sort-button" onClick={() => ordenar('cidade')}>Cidade</button></th><th>Unidade</th><th>Projeto</th><th>Responsável</th><th>Telefone</th><th><button className="sort-button" onClick={() => ordenar('status')}>Status</button></th><th>Ações</th></tr></thead>
            <tbody>{paginados.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selecionados.has(item.id)} onChange={() => alternarAluno(item.id)} aria-label={`Selecionar ${item.nome}`} /></td><td>{item.idPessoa}</td><td>{item.nome}</td><td>{item.idade}</td><td>{item.sexo}</td><td>{item.tipoDeficiencia}</td><td>{item.grau}</td><td>{item.cidade}</td><td>{item.unidade}</td><td>{item.projeto}</td><td>{item.responsavel}</td><td>{item.telefone}</td><td><span className="badge">{item.status}</span></td><td><div className="table-actions"><button onClick={() => abrirEditar(item, 'visualizar')}>Visualizar</button><button onClick={() => abrirEditar(item, 'editar')}>Editar</button><button className="danger" onClick={() => setConfirmacao({ tipo: 'individual', aluno: item })}>Deletar</button></div></td></tr>)}</tbody>
          </table>
        </div>
        <div className="pagination"><button disabled={paginaAtual === 1} onClick={() => setPagina((atual) => Math.max(1, atual - 1))}>Anterior</button><span>Página {paginaAtual} de {totalPaginas}</span><button disabled={paginaAtual === totalPaginas} onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}>Próxima</button></div>
      </section>

      {modalForm && <FormularioAluno modal={modalForm} erros={erros} setModal={setModalForm} onClose={() => setModalForm(null)} onSave={salvarFormulario} />}
      {importOpen && <ModalImportacao arquivoNome={arquivoNome} etapa={etapaImportacao} linhas={linhasImportacao} mapeamento={mapeamento} resumo={resumoImportacao} preview={importadosPreview} estrategia={estrategiaDuplicidade} setEstrategia={setEstrategiaDuplicidade} setEtapa={setEtapaImportacao} setMapeamento={setMapeamento} onClose={() => setImportOpen(false)} onFile={lerArquivo} onImport={confirmarImportacao} />}
      {confirmacao && <ModalConfirmacao confirmacao={confirmacao} onCancel={() => setConfirmacao(null)} onConfirm={confirmarExclusao} />}
    </div>
  );
}

function FormularioAluno({ modal, erros, setModal, onClose, onSave }: { modal: { mode: FormMode; form: FormAtendido }; erros: ReturnType<typeof validarFormulario>; setModal: (modal: { mode: FormMode; form: FormAtendido }) => void; onClose: () => void; onSave: () => void }) {
  const readonly = modal.mode === 'visualizar';
  const update = (campo: keyof FormAtendido, valor: string) => {
    const form = { ...modal.form, [campo]: valor };
    if (campo === 'dataNascimento') {
      const idade = calcularIdade(valor);
      form.idade = idade;
      form.faixaEtaria = idade ? calcularFaixaEtaria(Number(idade)) : '';
    }
    if (campo === 'idade') form.faixaEtaria = valor ? calcularFaixaEtaria(Number(valor)) : '';
    setModal({ ...modal, form });
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-panel wide">
        <header><h2>{modal.mode === 'novo' ? 'Novo aluno' : modal.mode === 'editar' ? 'Editar aluno' : 'Visualizar aluno'}</h2><button onClick={onClose}>Fechar</button></header>
        <div className="form-grid">
          <Field label="Nome completo" error={erros.nome}><input disabled={readonly} value={modal.form.nome} onChange={(event) => update('nome', event.target.value)} /></Field>
          <Field label="ID da pessoa"><input disabled={readonly} value={modal.form.idPessoa} onChange={(event) => update('idPessoa', event.target.value)} /></Field>
          <Field label="Data de nascimento" error={erros.nascimentoOuIdade}><input disabled={readonly} type="date" value={modal.form.dataNascimento} onChange={(event) => update('dataNascimento', event.target.value)} /></Field>
          <Field label="Idade" error={erros.nascimentoOuIdade}><input disabled={readonly} type="number" min="0" value={modal.form.idade} onChange={(event) => update('idade', event.target.value)} /></Field>
          <Field label="Faixa etária"><input disabled value={modal.form.faixaEtaria} /></Field>
          <Field label="Sexo"><select disabled={readonly} value={modal.form.sexo} onChange={(event) => update('sexo', event.target.value as Sexo)}>{sexos.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Tipo de deficiência" error={erros.deficienciaOuGrau}><select disabled={readonly} value={modal.form.tipoDeficiencia} onChange={(event) => update('tipoDeficiencia', event.target.value)}>{tiposDeficiencia.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Grau" error={erros.deficienciaOuGrau}><select disabled={readonly} value={modal.form.grau} onChange={(event) => update('grau', event.target.value as GrauDeficiencia)}>{graus.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Cidade" error={erros.cidade}><input disabled={readonly} value={modal.form.cidade} onChange={(event) => update('cidade', event.target.value)} /></Field>
          <Field label="Território/Bairro"><input disabled={readonly} value={modal.form.territorio} onChange={(event) => update('territorio', event.target.value)} /></Field>
          <Field label="Unidade"><select disabled={readonly} value={modal.form.unidade} onChange={(event) => update('unidade', event.target.value)}><option value="">Selecione</option>{unidades.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Projeto vinculado" error={erros.projetoOuServico}><select disabled={readonly} value={modal.form.projeto} onChange={(event) => update('projeto', event.target.value)}><option value="">Selecione</option>{projetosNomes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Serviço vinculado" error={erros.projetoOuServico}><select disabled={readonly} value={modal.form.servico} onChange={(event) => update('servico', event.target.value)}><option value="">Selecione</option>{servicos.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Nome do responsável"><input disabled={readonly} value={modal.form.responsavel} onChange={(event) => update('responsavel', event.target.value)} /></Field>
          <Field label="Telefone do responsável"><input disabled={readonly} value={modal.form.telefone} onChange={(event) => update('telefone', event.target.value)} /></Field>
          <Field label="E-mail do responsável"><input disabled={readonly} type="email" value={modal.form.email} onChange={(event) => update('email', event.target.value)} /></Field>
          <Field label="Escola"><input disabled={readonly} value={modal.form.escola} onChange={(event) => update('escola', event.target.value)} /></Field>
          <Field label="Origem da fonte"><input disabled={readonly} value={modal.form.origemFonte ?? ''} onChange={(event) => update('origemFonte', event.target.value)} /></Field>
          <Field label="Criado em"><input disabled value={modal.form.createdAt ?? ''} /></Field>
          <Field label="Atualizado em"><input disabled value={modal.form.updatedAt ?? ''} /></Field>
          <Field label="Status"><select disabled={readonly} value={modal.form.status} onChange={(event) => update('status', event.target.value as StatusAtendido)}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <label className="span-2">Observações<textarea disabled={readonly} value={modal.form.observacoes} onChange={(event) => update('observacoes', event.target.value)} /></label>
        </div>
        <p className="form-help">Campos obrigatórios: nome completo, data de nascimento ou idade, cidade, projeto ou serviço, tipo de deficiência ou grau.</p>
        {!readonly && <footer><button className="primary" onClick={onSave}>Salvar aluno</button></footer>}
      </section>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return <label className={error ? 'field-error' : ''}>{label}{children}{error && <small>Campo obrigatório ou combinação obrigatória não preenchida.</small>}</label>;
}

function ModalImportacao({ arquivoNome, etapa, linhas, mapeamento, resumo, preview, estrategia, setEstrategia, setEtapa, setMapeamento, onClose, onFile, onImport }: { arquivoNome: string; etapa: number; linhas: LinhaPlanilha[]; mapeamento: MapeamentoImportacao; resumo: ResumoImportacao; preview: Atendido[]; estrategia: 'ignorar' | 'importar' | 'atualizar'; setEstrategia: (valor: 'ignorar' | 'importar' | 'atualizar') => void; setEtapa: (etapa: number) => void; setMapeamento: (mapeamento: MapeamentoImportacao) => void; onClose: () => void; onFile: (file: File) => void; onImport: () => void }) {
  const colunas = Object.keys(mapeamento);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal-panel wide">
        <header><h2>Importar planilha de alunos</h2><button onClick={onClose}>Fechar</button></header>
        <p className="status">Atenção: confira se a planilha contém apenas os dados necessários para gestão do projeto. Evite importar informações sensíveis que não serão utilizadas nos relatórios.</p>
        <div className="steps">{['Enviar arquivo', 'Mapeamento de colunas', 'Prévia e validação', 'Confirmar importação'].map((item, index) => <button key={item} className={etapa === index + 1 ? 'active' : ''} onClick={() => setEtapa(index + 1)}>{index + 1}. {item}</button>)}</div>
        {etapa === 1 && <div className="upload-drop import-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void onFile(file); }}><strong>Arraste a planilha de alunos aqui ou clique para selecionar.</strong><input type="file" accept=".xlsx,.csv" onChange={(event) => event.target.files?.[0] && void onFile(event.target.files[0])} />{arquivoNome && <span>Arquivo selecionado: {arquivoNome}</span>}</div>}
        {etapa === 2 && <div className="mapping-grid">{colunas.map((coluna) => <label key={coluna}>{coluna}<select value={mapeamento[coluna]} onChange={(event) => setMapeamento({ ...mapeamento, [coluna]: event.target.value as CampoImportacao | '' })}>{camposPadrao.map((item) => <option key={item.label} value={item.campo}>{item.label}</option>)}</select>{normalizarBusca(coluna).includes('cpf') && <small>CPF detectado: mantenha como “Ignorar coluna”, pois não é obrigatório.</small>}</label>)}</div>}
        {etapa === 3 && <><div className="validation-grid"><Mini label="Total de linhas encontradas" value={resumo.total} /><Mini label="Linhas válidas" value={resumo.validas} /><Mini label="Linhas com alerta" value={resumo.alertas} /><Mini label="Possíveis duplicidades" value={resumo.duplicidades} /><Mini label="Registros sem nome" value={resumo.semNome} /><Mini label="Registros sem cidade" value={resumo.semCidade} /><Mini label="Registros sem deficiência ou grau" value={resumo.semDeficienciaOuGrau} /></div><ul className="alerts"><li>Aluno sem nome informado</li><li>Aluno sem cidade informada</li><li>Registro sem tipo de deficiência ou grau</li><li>Possível duplicidade encontrada</li><li>Telefone em formato inválido: {resumo.telefoneInvalido}</li></ul><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Cidade</th><th>Deficiência</th><th>Grau</th><th>Responsável</th><th>Telefone</th><th>Status</th></tr></thead><tbody>{preview.slice(0, 10).map((item) => <tr key={item.id}><td>{item.nome || 'Sem nome'}</td><td>{item.cidade || 'Sem cidade'}</td><td>{item.tipoDeficiencia}</td><td>{item.grau}</td><td>{item.responsavel}</td><td>{item.telefone}</td><td>{duplicado(item, preview.filter((outro) => outro.id !== item.id)) ? 'Alerta' : item.status}</td></tr>)}</tbody></table></div></>}
        {etapa === 4 && <div className="import-confirm"><label>Tratamento de duplicidades<select value={estrategia} onChange={(event) => setEstrategia(event.target.value as 'ignorar' | 'importar' | 'atualizar')}><option value="ignorar">Ignorar duplicados</option><option value="importar">Importar mesmo assim</option><option value="atualizar">Atualizar dados existentes</option></select></label><button className="primary" onClick={onImport}>Importar alunos</button></div>}
        <footer><button disabled={etapa === 1} onClick={() => setEtapa(Math.max(1, etapa - 1))}>Voltar</button><button disabled={etapa === 4 || (etapa === 1 && !linhas.length)} onClick={() => setEtapa(Math.min(4, etapa + 1))}>Avançar</button></footer>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="mini-metric"><strong>{value}</strong><span>{label}</span></div>;
}

function ModalConfirmacao({ confirmacao, onCancel, onConfirm }: { confirmacao: Confirmacao; onCancel: () => void; onConfirm: () => void }) {
  if (!confirmacao) return null;
  const texto = confirmacao.tipo === 'individual'
    ? 'Tem certeza que deseja excluir este aluno? Esta ação removerá o registro da listagem de atendidos.'
    : `Você selecionou ${confirmacao.ids.length} alunos. Deseja realmente excluir estes registros?`;
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal-panel"><h2>Confirmar exclusão</h2><p>{texto}</p><footer><button onClick={onCancel}>Cancelar</button><button className="danger" onClick={onConfirm}>Confirmar exclusão</button></footer></section></div>;
}
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
