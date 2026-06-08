import * as XLSX from 'xlsx';
import { useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { MetricCard } from '../components/MetricCard';
import { atendidos as mockAtendidos, cidades, graus, projetosNomes, servicos, sexos, tiposDeficiencia, unidades } from '../data/mockData';
import { calcularFaixaEtaria, padronizarGrau, padronizarSexo, padronizarTipoDeficiencia, textoOuNaoInformado } from '../lib/normalizacao';
import { exportarCSV, exportarExcel } from '../lib/exportacao';
import { atualizarAtendido, criarAtendido, excluirAtendidoDefinitivamente, importarAtendidos, reativarAtendido, retirarAtendidos } from '../lib/supabaseService';
import type { Atendido, GrauDeficiencia, Sexo, StatusAtendido } from '../types';

type AbaAtendidos = 'lista' | 'cadastro' | 'importacao' | 'retirar' | 'retirados';
type FormMode = 'editar' | 'visualizar';
type SortKey = 'nome' | 'cidade' | 'idade' | 'status';
type LinhaPlanilha = Record<string, unknown>;
type CampoImportacao = keyof Pick<Atendido, 'nome' | 'idPessoa' | 'dataNascimento' | 'idade' | 'faixaEtaria' | 'sexo' | 'tipoDeficiencia' | 'grau' | 'cidade' | 'territorio' | 'unidade' | 'projeto' | 'servico' | 'responsavel' | 'telefone' | 'email' | 'escola' | 'observacoes' | 'status' | 'origemFonte' | 'createdAt' | 'updatedAt'>;
type MapeamentoImportacao = Record<string, CampoImportacao | ''>;
type FormAtendido = Omit<Atendido, 'id' | 'idade'> & { id?: string; idade: string };
type ConfirmacaoExclusao = { aluno: Atendido } | null;
type RetiradaModal = { ids: string[]; nomes: string[] } | null;
type RetiradaForm = { motivoRetirada: string; dataRetirada: string; observacoesRetirada: string; retiradoPor: string };

const abas: Array<{ id: AbaAtendidos; label: string }> = [
  { id: 'lista', label: 'Lista de alunos' },
  { id: 'cadastro', label: 'Cadastrar aluno' },
  { id: 'importacao', label: 'Importar planilha' },
  { id: 'retirar', label: 'Retirar alunos' },
  { id: 'retirados', label: 'Alunos retirados' },
];
const statusOptions: StatusAtendido[] = ['Ativo', 'Inativo', 'Aguardando revisão', 'Inconsistente'];
const motivosRetirada = ['Concluiu participação', 'Mudança de cidade', 'Desistência', 'Falta de frequência', 'Solicitação da família', 'Encaminhado para outro serviço', 'Outro'];
const camposPadrao: Array<{ campo: CampoImportacao | ''; label: string }> = [
  { campo: '', label: 'Ignorar coluna' }, { campo: 'nome', label: 'Nome completo' }, { campo: 'idPessoa', label: 'ID da pessoa' }, { campo: 'dataNascimento', label: 'Data de nascimento' },
  { campo: 'idade', label: 'Idade' }, { campo: 'faixaEtaria', label: 'Faixa etária' }, { campo: 'sexo', label: 'Sexo' }, { campo: 'tipoDeficiencia', label: 'Tipo de deficiência' },
  { campo: 'grau', label: 'Grau' }, { campo: 'cidade', label: 'Cidade' }, { campo: 'territorio', label: 'Território/Bairro' }, { campo: 'unidade', label: 'Unidade' },
  { campo: 'projeto', label: 'Projeto' }, { campo: 'servico', label: 'Serviço' }, { campo: 'responsavel', label: 'Responsável' }, { campo: 'telefone', label: 'Telefone' },
  { campo: 'email', label: 'E-mail' }, { campo: 'escola', label: 'Escola' }, { campo: 'observacoes', label: 'Observações' }, { campo: 'status', label: 'Status' },
  { campo: 'origemFonte', label: 'Origem da fonte' }, { campo: 'createdAt', label: 'Data de criação' }, { campo: 'updatedAt', label: 'Data de atualização' },
];
const vazio: FormAtendido = { idPessoa: '', nome: '', dataNascimento: '', idade: '', faixaEtaria: '', sexo: 'Não informado', tipoDeficiencia: 'Não informado', grau: 'Não informado', cidade: '', territorio: '', unidade: '', projeto: '', servico: '', responsavel: '', telefone: '', email: '', escola: '', observacoes: '', status: 'Ativo', origemFonte: 'Cadastro manual' };
const retiradaInicial: RetiradaForm = { motivoRetirada: 'Concluiu participação', dataRetirada: new Date().toISOString().slice(0, 10), observacoesRetirada: '', retiradoPor: 'Sistema' };

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
function normalizarBusca(valor: string) { return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function telefoneValido(telefone: string) { return !telefone || telefone.replace(/\D/g, '').length >= 10; }
function validarFormulario(form: FormAtendido) {
  return { nome: !form.nome.trim(), nascimentoOuIdade: !form.dataNascimento && !form.idade, cidade: !form.cidade.trim(), projetoOuServico: !form.projeto.trim() && !form.servico.trim(), deficienciaOuGrau: (!form.tipoDeficiencia || form.tipoDeficiencia === 'Não informado') && (!form.grau || form.grau === 'Não informado') };
}
function temErroFormulario(erros: ReturnType<typeof validarFormulario>) { return Object.values(erros).some(Boolean); }
function montarAtendido(form: FormAtendido): Atendido {
  const idade = Number(form.idade || calcularIdade(form.dataNascimento) || 0);
  return { ...form, id: form.id ?? `atendido-${Date.now()}`, idPessoa: form.idPessoa || `P-${Date.now()}`, idade, faixaEtaria: form.faixaEtaria || calcularFaixaEtaria(idade), updatedAt: new Date().toISOString(), createdAt: form.createdAt ?? new Date().toISOString() };
}
function duplicado(aluno: Partial<Atendido>, lista: Atendido[]) {
  const nome = normalizarBusca(aluno.nome ?? '');
  const telefone = (aluno.telefone ?? '').replace(/\D/g, '');
  return lista.some((item) => Boolean(aluno.idPessoa && item.idPessoa === aluno.idPessoa) || Boolean(nome && aluno.dataNascimento && normalizarBusca(item.nome) === nome && item.dataNascimento === aluno.dataNascimento) || Boolean(nome && telefone && normalizarBusca(item.nome) === nome && item.telefone.replace(/\D/g, '') === telefone));
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
function aplicarFiltros(lista: Atendido[], busca: string, filtros: { cidade: string; projeto: string; tipoDeficiencia?: string; grau?: string; status: string; unidade?: string }) {
  const termo = normalizarBusca(busca);
  return lista.filter((item) => !item.deletedAt && item.status !== 'Excluído')
    .filter((item) => !termo || normalizarBusca(item.nome).includes(termo))
    .filter((item) => !filtros.cidade || item.cidade === filtros.cidade)
    .filter((item) => !filtros.projeto || item.projeto === filtros.projeto)
    .filter((item) => !filtros.unidade || item.unidade === filtros.unidade)
    .filter((item) => !filtros.tipoDeficiencia || item.tipoDeficiencia === filtros.tipoDeficiencia)
    .filter((item) => !filtros.grau || item.grau === filtros.grau)
    .filter((item) => !filtros.status || item.status === filtros.status);
}

export function Atendidos() {
  const [aba, setAba] = useState<AbaAtendidos>('lista');
  const [lista, setLista] = useState<Atendido[]>(mockAtendidos.filter((item) => item.status !== 'Excluído'));
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [selecionadosRetirada, setSelecionadosRetirada] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [modalForm, setModalForm] = useState<{ mode: FormMode; form: FormAtendido } | null>(null);
  const [formCadastro, setFormCadastro] = useState<FormAtendido>(vazio);
  const [errosCadastro, setErrosCadastro] = useState(validarFormulario(vazio));
  const [busca, setBusca] = useState('');
  const [buscaRetirada, setBuscaRetirada] = useState('');
  const [filtros, setFiltros] = useState({ cidade: '', projeto: '', tipoDeficiencia: '', grau: '', status: '' });
  const [filtrosRetirada, setFiltrosRetirada] = useState({ cidade: '', projeto: '', unidade: '', status: '' });
  const [ordenacao, setOrdenacao] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'nome', dir: 'asc' });
  const [pagina, setPagina] = useState(1);
  const [arquivoNome, setArquivoNome] = useState('');
  const [linhasImportacao, setLinhasImportacao] = useState<LinhaPlanilha[]>([]);
  const [mapeamento, setMapeamento] = useState<MapeamentoImportacao>({});
  const [etapaImportacao, setEtapaImportacao] = useState(1);
  const [estrategiaDuplicidade, setEstrategiaDuplicidade] = useState<'ignorar' | 'importar' | 'atualizar'>('ignorar');
  const [retiradaModal, setRetiradaModal] = useState<RetiradaModal>(null);
  const [retiradaForm, setRetiradaForm] = useState<RetiradaForm>(retiradaInicial);
  const [confirmacaoDefinitiva, setConfirmacaoDefinitiva] = useState<ConfirmacaoExclusao>(null);
  const [incluirRetiradosRelatorio, setIncluirRetiradosRelatorio] = useState(false);
  const porPagina = 10;

  const opcoes = useMemo(() => ({
    cidade: Array.from(new Set([...cidades, ...lista.map((item) => item.cidade)].filter(Boolean))).sort(),
    projeto: Array.from(new Set([...projetosNomes, ...lista.map((item) => item.projeto)].filter(Boolean))).sort(),
    unidade: Array.from(new Set([...unidades, ...lista.map((item) => item.unidade)].filter(Boolean))).sort(),
    tipoDeficiencia: Array.from(new Set([...tiposDeficiencia, ...lista.map((item) => item.tipoDeficiencia)].filter(Boolean))).sort(),
    grau: Array.from(new Set([...graus, ...lista.map((item) => item.grau)].filter(Boolean))).sort(),
    status: Array.from(new Set([...statusOptions, 'Retirado', ...lista.map((item) => item.status)].filter(Boolean))).sort(),
  }), [lista]);
  const ativos = lista.filter((item) => !item.deletedAt && item.status !== 'Retirado' && item.status !== 'Excluído');
  const retirados = lista.filter((item) => !item.deletedAt && item.status === 'Retirado');
  const cardsBase = incluirRetiradosRelatorio ? lista.filter((item) => item.status !== 'Excluído' && !item.deletedAt) : ativos;
  const filtrados = useMemo(() => aplicarFiltros(ativos, busca, filtros).sort((a, b) => {
    const valorA = a[ordenacao.key]; const valorB = b[ordenacao.key];
    const resultado = typeof valorA === 'number' && typeof valorB === 'number' ? valorA - valorB : String(valorA).localeCompare(String(valorB));
    return ordenacao.dir === 'asc' ? resultado : -resultado;
  }), [ativos, busca, filtros, ordenacao]);
  const alunosRetirada = useMemo(() => aplicarFiltros(ativos, buscaRetirada, filtrosRetirada), [ativos, buscaRetirada, filtrosRetirada]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);
  const todosMarcados = paginados.length > 0 && paginados.every((item) => selecionados.has(item.id));
  const importadosPreview = useMemo(() => linhasImportacao.map((linha, index) => linhaParaAtendido(linha, mapeamento, index)), [linhasImportacao, mapeamento]);
  const resumoImportacao = useMemo(() => {
    const semNome = importadosPreview.filter((item) => !item.nome.trim()).length;
    const semCidade = importadosPreview.filter((item) => !item.cidade.trim()).length;
    const semDeficienciaOuGrau = importadosPreview.filter((item) => item.tipoDeficiencia === 'Não informado' && item.grau === 'Não informado').length;
    const duplicidades = importadosPreview.filter((item) => duplicado(item, lista)).length;
    const telefoneInvalido = importadosPreview.filter((item) => !telefoneValido(item.telefone)).length;
    const alertas = semNome + semCidade + semDeficienciaOuGrau + duplicidades + telefoneInvalido;
    return { total: importadosPreview.length, validas: Math.max(0, importadosPreview.length - alertas), alertas, duplicidades, semNome, semCidade, semDeficienciaOuGrau, telefoneInvalido };
  }, [importadosPreview, lista]);

  function ordenar(key: SortKey) { setOrdenacao((atual) => ({ key, dir: atual.key === key && atual.dir === 'asc' ? 'desc' : 'asc' })); }
  function alternar(id: string, setter: (fn: (atual: Set<string>) => Set<string>) => void) { setter((atual) => { const novo = new Set(atual); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; }); }
  function abrirEditar(aluno: Atendido, mode: FormMode) { setModalForm({ mode, form: { ...aluno, idade: String(aluno.idade) } }); }
  async function salvarEdicao() {
    if (!modalForm || modalForm.mode === 'visualizar') return;
    const validacao = validarFormulario(modalForm.form);
    if (temErroFormulario(validacao)) return;
    const aluno = montarAtendido(modalForm.form);
    await atualizarAtendido(aluno.id, aluno);
    setLista((atual) => atual.map((item) => item.id === aluno.id ? aluno : item));
    setToast('Dados do aluno atualizados com sucesso.'); setModalForm(null);
  }
  async function salvarCadastro() {
    const validacao = validarFormulario(formCadastro); setErrosCadastro(validacao); if (temErroFormulario(validacao)) return;
    const aluno = montarAtendido(formCadastro);
    await criarAtendido(aluno);
    setLista((atual) => [aluno, ...atual]); setToast('Aluno cadastrado com sucesso.'); setFormCadastro(vazio); setAba('lista');
  }
  async function lerArquivo(file: File) {
    const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { defval: '' }); const columns = Object.keys(rows[0] ?? {});
    setArquivoNome(file.name); setLinhasImportacao(rows); setMapeamento(Object.fromEntries(columns.map((coluna) => [coluna, reconhecerColuna(coluna)])) as MapeamentoImportacao); setEtapaImportacao(2);
  }
  async function confirmarImportacao() {
    let novos = importadosPreview.filter((item) => item.nome.trim() && item.cidade.trim() && (item.tipoDeficiencia !== 'Não informado' || item.grau !== 'Não informado'));
    if (estrategiaDuplicidade === 'ignorar') novos = novos.filter((item) => !duplicado(item, lista));
    if (estrategiaDuplicidade === 'atualizar') {
      const atualizados = lista.map((existente) => { const substituto = novos.find((item) => duplicado(item, [existente])); return substituto ? { ...existente, ...substituto, id: existente.id, updatedAt: new Date().toISOString() } : existente; });
      setLista([...novos.filter((item) => !duplicado(item, lista)), ...atualizados]);
    } else setLista((atual) => [...novos, ...atual]);
    await importarAtendidos(novos, arquivoNome || 'planilha_sem_nome.xlsx'); setToast('Alunos importados com sucesso.'); setAba('lista'); setEtapaImportacao(1); setArquivoNome(''); setLinhasImportacao([]); setMapeamento({});
  }
  async function confirmarRetirada() {
    if (!retiradaModal) return;
    const data = { ...retiradaForm, retiradoPor: retiradaForm.retiradoPor || 'Sistema' };
    await retirarAtendidos(retiradaModal.ids, data);
    setLista((atual) => atual.map((item) => retiradaModal.ids.includes(item.id) ? { ...item, status: 'Retirado', dataRetirada: data.dataRetirada, motivoRetirada: data.motivoRetirada, observacoesRetirada: data.observacoesRetirada, retiradoPor: data.retiradoPor, updatedAt: new Date().toISOString() } : item));
    setSelecionados(new Set()); setSelecionadosRetirada(new Set()); setToast(retiradaModal.ids.length === 1 ? 'Aluno retirado com sucesso.' : 'Alunos selecionados retirados com sucesso.'); setRetiradaModal(null); setAba('retirados');
  }
  async function reativar(aluno: Atendido) {
    await reativarAtendido(aluno.id, aluno.nome);
    setLista((atual) => atual.map((item) => item.id === aluno.id ? { ...item, status: 'Ativo', updatedAt: new Date().toISOString() } : item)); setToast('Aluno reativado com sucesso.');
  }
  async function excluirDefinitivo() {
    if (!confirmacaoDefinitiva) return;
    await excluirAtendidoDefinitivamente(confirmacaoDefinitiva.aluno.id, confirmacaoDefinitiva.aluno.nome);
    setLista((atual) => atual.filter((item) => item.id !== confirmacaoDefinitiva.aluno.id)); setToast('Aluno excluído definitivamente.'); setConfirmacaoDefinitiva(null);
  }
  function exportarLista(tipo: 'excel' | 'csv') {
    const linhas = filtrados.map((item) => ({ ID: item.idPessoa, Nome: item.nome, Idade: item.idade, Sexo: item.sexo, Deficiência: item.tipoDeficiencia, Grau: item.grau, Cidade: item.cidade, Unidade: item.unidade, Projeto: item.projeto, Responsável: item.responsavel, Telefone: item.telefone, Email: item.email, Escola: item.escola, Observações: item.observacoes, Status: item.status, Origem: item.origemFonte, CriadoEm: item.createdAt, AtualizadoEm: item.updatedAt }));
    if (tipo === 'excel') exportarExcel(linhas, 'lista-atendidos'); else exportarCSV(linhas, 'lista-atendidos'); setToast('Lista de alunos exportada com sucesso.');
  }

  return <div className="page-stack">
    <header className="page-header"><div><span>Atendidos</span><h1>Gerenciamento de alunos e atendidos</h1></div><strong>{filtrados.length} registros na lista ativa</strong></header>
    {toast && <p className="status toast sucesso">{toast}</p>}
    <p className="status">Utilize dados pessoais apenas quando necessário. Sempre que possível, trabalhe com ID da pessoa para proteger informações sensíveis.</p>
    <section className="metric-grid compact"><MetricCard label="Total de alunos ativos" value={ativos.length} /><MetricCard label="Alunos com deficiência" value={cardsBase.filter((a) => a.tipoDeficiencia !== 'Não informado').length} /><MetricCard label="Alunos retirados" value={retirados.length} /><MetricCard label="Alunos aguardando revisão" value={lista.filter((a) => a.status === 'Aguardando revisão').length} /><MetricCard label="Cidades atendidas" value={new Set(cardsBase.map((a) => a.cidade)).size} /></section>
    <label className="report-toggle"><input type="checkbox" checked={incluirRetiradosRelatorio} onChange={(event) => setIncluirRetiradosRelatorio(event.target.checked)} />Incluir alunos retirados nos relatórios e cards</label>
    <section className="tabs-nav">{abas.map((item) => <button key={item.id} className={aba === item.id ? 'active' : ''} onClick={() => setAba(item.id)}>{item.label}</button>)}</section>

    {aba === 'lista' && <ListaAlunos filtrados={filtrados} paginados={paginados} selecionados={selecionados} todosMarcados={todosMarcados} paginaAtual={paginaAtual} totalPaginas={totalPaginas} busca={busca} filtros={filtros} opcoes={opcoes} setBusca={setBusca} setFiltros={setFiltros} setPagina={setPagina} ordenar={ordenar} exportarLista={exportarLista} alternarAluno={(id) => alternar(id, setSelecionados)} alternarTodos={() => setSelecionados((atual) => { const novo = new Set(atual); if (todosMarcados) paginados.forEach((item) => novo.delete(item.id)); else paginados.forEach((item) => novo.add(item.id)); return novo; })} abrirEditar={abrirEditar} retirar={(aluno) => { setRetiradaForm(retiradaInicial); setRetiradaModal({ ids: [aluno.id], nomes: [aluno.nome] }); }} />}
    {aba === 'cadastro' && <section className="chart-card"><FormularioAluno form={formCadastro} erros={errosCadastro} setForm={setFormCadastro} onSave={salvarCadastro} onClear={() => { setFormCadastro(vazio); setErrosCadastro(validarFormulario(vazio)); }} onBack={() => setAba('lista')} /></section>}
    {aba === 'importacao' && <ImportacaoAlunos arquivoNome={arquivoNome} etapa={etapaImportacao} linhas={linhasImportacao} mapeamento={mapeamento} resumo={resumoImportacao} preview={importadosPreview} estrategia={estrategiaDuplicidade} setEstrategia={setEstrategiaDuplicidade} setEtapa={setEtapaImportacao} setMapeamento={setMapeamento} onFile={lerArquivo} onImport={confirmarImportacao} />}
    {aba === 'retirar' && <RetirarAlunos alunos={alunosRetirada} selecionados={selecionadosRetirada} busca={buscaRetirada} filtros={filtrosRetirada} opcoes={opcoes} setBusca={setBuscaRetirada} setFiltros={setFiltrosRetirada} alternarAluno={(id) => alternar(id, setSelecionadosRetirada)} retirar={(ids, nomes) => { setRetiradaForm(retiradaInicial); setRetiradaModal({ ids, nomes }); }} />}
    {aba === 'retirados' && <AlunosRetirados alunos={retirados} visualizar={(aluno) => abrirEditar(aluno, 'visualizar')} reativar={reativar} excluir={(aluno) => setConfirmacaoDefinitiva({ aluno })} />}
    {modalForm && <div className="modal-backdrop"><section className="modal-panel wide"><header><h2>{modalForm.mode === 'editar' ? 'Editar aluno' : 'Visualizar histórico do aluno'}</h2><button onClick={() => setModalForm(null)}>Fechar</button></header><FormularioAluno form={modalForm.form} readonly={modalForm.mode === 'visualizar'} setForm={(form) => setModalForm({ ...modalForm, form })} onSave={salvarEdicao} /></section></div>}
    {retiradaModal && <ModalRetirada modal={retiradaModal} form={retiradaForm} setForm={setRetiradaForm} onCancel={() => setRetiradaModal(null)} onConfirm={confirmarRetirada} />}
    {confirmacaoDefinitiva && <div className="modal-backdrop"><section className="modal-panel"><h2>Excluir definitivamente</h2><p>Essa ação apagará definitivamente o cadastro deste aluno. Para segurança e prestação de contas, recomenda-se apenas manter como retirado. Deseja continuar?</p><footer><button onClick={() => setConfirmacaoDefinitiva(null)}>Cancelar</button><button className="danger" onClick={excluirDefinitivo}>Excluir definitivamente</button></footer></section></div>}
  </div>;
}

function ListaAlunos(props: { filtrados: Atendido[]; paginados: Atendido[]; selecionados: Set<string>; todosMarcados: boolean; paginaAtual: number; totalPaginas: number; busca: string; filtros: { cidade: string; projeto: string; tipoDeficiencia: string; grau: string; status: string }; opcoes: Record<string, string[]>; setBusca: (v: string) => void; setFiltros: Dispatch<SetStateAction<{ cidade: string; projeto: string; tipoDeficiencia: string; grau: string; status: string }>>; setPagina: Dispatch<SetStateAction<number>>; ordenar: (key: SortKey) => void; exportarLista: (tipo: 'excel' | 'csv') => void; alternarAluno: (id: string) => void; alternarTodos: () => void; abrirEditar: (a: Atendido, m: FormMode) => void; retirar: (a: Atendido) => void }) {
  return <><section className="toolbar-card"><div className="actions"><button onClick={() => props.exportarLista('excel')}>Exportar lista Excel</button><button onClick={() => props.exportarLista('csv')}>Exportar lista CSV</button></div><div className="filters"><label>Buscar por nome<input value={props.busca} onChange={(e) => { props.setBusca(e.target.value); props.setPagina(1); }} /></label>{(['cidade', 'projeto', 'tipoDeficiencia', 'grau', 'status'] as const).map((campo) => <label key={campo}>{campo === 'tipoDeficiencia' ? 'Deficiência' : campo}<select value={props.filtros[campo]} onChange={(e) => { props.setFiltros((a) => ({ ...a, [campo]: e.target.value })); props.setPagina(1); }}><option value="">Todos</option>{(props.opcoes[campo] ?? []).map((opcao) => <option key={opcao}>{opcao}</option>)}</select></label>)}</div></section><TabelaAtivos alunos={props.paginados} selecionados={props.selecionados} todosMarcados={props.todosMarcados} alternarTodos={props.alternarTodos} alternarAluno={props.alternarAluno} ordenar={props.ordenar} abrirEditar={props.abrirEditar} retirar={props.retirar} /><div className="pagination"><button disabled={props.paginaAtual === 1} onClick={() => props.setPagina((a) => Math.max(1, a - 1))}>Anterior</button><span>Página {props.paginaAtual} de {props.totalPaginas} • {props.filtrados.length} alunos</span><button disabled={props.paginaAtual === props.totalPaginas} onClick={() => props.setPagina((a) => Math.min(props.totalPaginas, a + 1))}>Próxima</button></div></>;
}
function TabelaAtivos({ alunos, selecionados, todosMarcados, alternarTodos, alternarAluno, ordenar, abrirEditar, retirar }: { alunos: Atendido[]; selecionados: Set<string>; todosMarcados: boolean; alternarTodos: () => void; alternarAluno: (id: string) => void; ordenar: (key: SortKey) => void; abrirEditar: (a: Atendido, m: FormMode) => void; retirar: (a: Atendido) => void }) {
  return <section className="chart-card"><div className="table-wrap"><table><thead><tr><th><input type="checkbox" checked={todosMarcados} onChange={alternarTodos} /></th><th>ID</th><th><button className="sort-button" onClick={() => ordenar('nome')}>Nome</button></th><th><button className="sort-button" onClick={() => ordenar('idade')}>Idade</button></th><th>Sexo</th><th>Tipo de deficiência</th><th>Grau</th><th><button className="sort-button" onClick={() => ordenar('cidade')}>Cidade</button></th><th>Unidade</th><th>Projeto</th><th>Responsável</th><th>Telefone</th><th><button className="sort-button" onClick={() => ordenar('status')}>Status</button></th><th>Ações</th></tr></thead><tbody>{alunos.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selecionados.has(item.id)} onChange={() => alternarAluno(item.id)} /></td><td>{item.idPessoa}</td><td>{item.nome}</td><td>{item.idade}</td><td>{item.sexo}</td><td>{item.tipoDeficiencia}</td><td>{item.grau}</td><td>{item.cidade}</td><td>{item.unidade}</td><td>{item.projeto}</td><td>{item.responsavel}</td><td>{item.telefone}</td><td><span className="badge">{item.status}</span></td><td><div className="table-actions"><button onClick={() => abrirEditar(item, 'visualizar')}>Visualizar</button><button onClick={() => abrirEditar(item, 'editar')}>Editar</button><button onClick={() => retirar(item)}>Retirar</button></div></td></tr>)}</tbody></table></div></section>;
}
function FormularioAluno({ form, erros = validarFormulario(form), readonly = false, setForm, onSave, onClear, onBack }: { form: FormAtendido; erros?: ReturnType<typeof validarFormulario>; readonly?: boolean; setForm: (f: FormAtendido) => void; onSave: () => void; onClear?: () => void; onBack?: () => void }) {
  const update = (campo: keyof FormAtendido, valor: string) => { const next = { ...form, [campo]: valor }; if (campo === 'dataNascimento') { const idade = calcularIdade(valor); next.idade = idade; next.faixaEtaria = idade ? calcularFaixaEtaria(Number(idade)) : ''; } if (campo === 'idade') next.faixaEtaria = valor ? calcularFaixaEtaria(Number(valor)) : ''; setForm(next); };
  return <><div className="form-grid"><Field label="Nome completo" error={erros.nome}><input disabled={readonly} value={form.nome} onChange={(e) => update('nome', e.target.value)} /></Field><Field label="ID da pessoa"><input disabled={readonly} value={form.idPessoa} onChange={(e) => update('idPessoa', e.target.value)} /></Field><Field label="Data de nascimento" error={erros.nascimentoOuIdade}><input disabled={readonly} type="date" value={form.dataNascimento} onChange={(e) => update('dataNascimento', e.target.value)} /></Field><Field label="Idade" error={erros.nascimentoOuIdade}><input disabled={readonly} type="number" min="0" value={form.idade} onChange={(e) => update('idade', e.target.value)} /></Field><Field label="Faixa etária"><input disabled value={form.faixaEtaria} /></Field><Field label="Sexo"><select disabled={readonly} value={form.sexo} onChange={(e) => update('sexo', e.target.value as Sexo)}>{sexos.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Tipo de deficiência" error={erros.deficienciaOuGrau}><select disabled={readonly} value={form.tipoDeficiencia} onChange={(e) => update('tipoDeficiencia', e.target.value)}>{tiposDeficiencia.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Grau" error={erros.deficienciaOuGrau}><select disabled={readonly} value={form.grau} onChange={(e) => update('grau', e.target.value as GrauDeficiencia)}>{graus.map((g) => <option key={g}>{g}</option>)}</select></Field><Field label="Cidade" error={erros.cidade}><input disabled={readonly} value={form.cidade} onChange={(e) => update('cidade', e.target.value)} /></Field><Field label="Território/Bairro"><input disabled={readonly} value={form.territorio} onChange={(e) => update('territorio', e.target.value)} /></Field><Field label="Unidade"><select disabled={readonly} value={form.unidade} onChange={(e) => update('unidade', e.target.value)}><option value="">Selecione</option>{unidades.map((u) => <option key={u}>{u}</option>)}</select></Field><Field label="Projeto vinculado" error={erros.projetoOuServico}><select disabled={readonly} value={form.projeto} onChange={(e) => update('projeto', e.target.value)}><option value="">Selecione</option>{projetosNomes.map((p) => <option key={p}>{p}</option>)}</select></Field><Field label="Serviço vinculado" error={erros.projetoOuServico}><select disabled={readonly} value={form.servico} onChange={(e) => update('servico', e.target.value)}><option value="">Selecione</option>{servicos.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Nome do responsável"><input disabled={readonly} value={form.responsavel} onChange={(e) => update('responsavel', e.target.value)} /></Field><Field label="Telefone do responsável"><input disabled={readonly} value={form.telefone} onChange={(e) => update('telefone', e.target.value)} /></Field><Field label="E-mail do responsável"><input disabled={readonly} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></Field><Field label="Escola"><input disabled={readonly} value={form.escola} onChange={(e) => update('escola', e.target.value)} /></Field><Field label="Status"><select disabled={readonly} value={form.status} onChange={(e) => update('status', e.target.value as StatusAtendido)}>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select></Field><label className="span-2">Observações<textarea disabled={readonly} value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} /></label></div><p className="form-help">Campos obrigatórios: nome completo, data de nascimento ou idade, cidade, projeto ou serviço, tipo de deficiência ou grau.</p>{!readonly && <footer><button className="primary" onClick={onSave}>Salvar aluno</button>{onClear && <button onClick={onClear}>Limpar formulário</button>}{onBack && <button onClick={onBack}>Voltar para lista</button>}</footer>}</>;
}
function Field({ label, error, children }: { label: string; error?: boolean; children: ReactNode }) { return <label className={error ? 'field-error' : ''}>{label}{children}{error && <small>Campo obrigatório ou combinação obrigatória não preenchida.</small>}</label>; }
function ImportacaoAlunos({ arquivoNome, etapa, linhas, mapeamento, resumo, preview, estrategia, setEstrategia, setEtapa, setMapeamento, onFile, onImport }: { arquivoNome: string; etapa: number; linhas: LinhaPlanilha[]; mapeamento: MapeamentoImportacao; resumo: { total: number; validas: number; alertas: number; duplicidades: number; semNome: number; semCidade: number; semDeficienciaOuGrau: number; telefoneInvalido: number }; preview: Atendido[]; estrategia: 'ignorar' | 'importar' | 'atualizar'; setEstrategia: (v: 'ignorar' | 'importar' | 'atualizar') => void; setEtapa: (n: number) => void; setMapeamento: (m: MapeamentoImportacao) => void; onFile: (f: File) => void; onImport: () => void }) {
  const colunas = Object.keys(mapeamento);
  return <section className="chart-card"><p className="status">Atenção: confira se a planilha contém apenas os dados necessários para gestão do projeto. Evite importar informações sensíveis que não serão utilizadas nos relatórios.</p><div className="steps">{['Enviar arquivo', 'Mapear colunas', 'Validar dados', 'Confirmar importação'].map((s, i) => <button key={s} className={etapa === i + 1 ? 'active' : ''} onClick={() => setEtapa(i + 1)}>{i + 1}. {s}</button>)}</div>{etapa === 1 && <div className="upload-drop import-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) void onFile(file); }}><strong>Arraste a planilha de alunos aqui ou clique para selecionar.</strong><input type="file" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />{arquivoNome && <span>Arquivo selecionado: {arquivoNome}</span>}</div>}{etapa === 2 && <div className="mapping-grid">{colunas.map((coluna) => <label key={coluna}>{coluna}<select value={mapeamento[coluna]} onChange={(e) => setMapeamento({ ...mapeamento, [coluna]: e.target.value as CampoImportacao | '' })}>{camposPadrao.map((c) => <option key={c.label} value={c.campo}>{c.label}</option>)}</select>{normalizarBusca(coluna).includes('cpf') && <small>CPF detectado: mantenha como “Ignorar coluna”.</small>}</label>)}</div>}{etapa === 3 && <><div className="validation-grid"><Mini label="Total de linhas encontradas" value={resumo.total} /><Mini label="Linhas válidas" value={resumo.validas} /><Mini label="Linhas com alerta" value={resumo.alertas} /><Mini label="Possíveis duplicidades" value={resumo.duplicidades} /><Mini label="Registros sem nome" value={resumo.semNome} /><Mini label="Registros sem cidade" value={resumo.semCidade} /><Mini label="Registros sem deficiência ou grau" value={resumo.semDeficienciaOuGrau} /></div><ul className="alerts"><li>Aluno sem nome informado</li><li>Aluno sem cidade informada</li><li>Registro sem tipo de deficiência ou grau</li><li>Possível duplicidade encontrada</li><li>Telefone em formato inválido: {resumo.telefoneInvalido}</li></ul><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Cidade</th><th>Deficiência</th><th>Grau</th><th>Responsável</th><th>Telefone</th><th>Status</th></tr></thead><tbody>{preview.slice(0, 10).map((item) => <tr key={item.id}><td>{item.nome || 'Sem nome'}</td><td>{item.cidade || 'Sem cidade'}</td><td>{item.tipoDeficiencia}</td><td>{item.grau}</td><td>{item.responsavel}</td><td>{item.telefone}</td><td>{item.status}</td></tr>)}</tbody></table></div></>}{etapa === 4 && <div className="import-confirm"><label>Tratamento de duplicidades<select value={estrategia} onChange={(e) => setEstrategia(e.target.value as 'ignorar' | 'importar' | 'atualizar')}><option value="ignorar">Ignorar duplicados</option><option value="importar">Importar mesmo assim</option><option value="atualizar">Atualizar dados existentes</option></select></label><button className="primary" onClick={onImport}>Importar alunos</button></div>}<footer><button disabled={etapa === 1} onClick={() => setEtapa(Math.max(1, etapa - 1))}>Voltar</button><button disabled={etapa === 4 || (etapa === 1 && !linhas.length)} onClick={() => setEtapa(Math.min(4, etapa + 1))}>Avançar</button></footer></section>;
}
function RetirarAlunos({ alunos, selecionados, busca, filtros, opcoes, setBusca, setFiltros, alternarAluno, retirar }: { alunos: Atendido[]; selecionados: Set<string>; busca: string; filtros: { cidade: string; projeto: string; unidade: string; status: string }; opcoes: Record<string, string[]>; setBusca: (v: string) => void; setFiltros: Dispatch<SetStateAction<{ cidade: string; projeto: string; unidade: string; status: string }>>; alternarAluno: (id: string) => void; retirar: (ids: string[], nomes: string[]) => void }) {
  return <><section className="toolbar-card"><div className="filters"><label>Busca por nome<input value={busca} onChange={(e) => setBusca(e.target.value)} /></label>{(['projeto', 'cidade', 'unidade', 'status'] as const).map((campo) => <label key={campo}>{campo}<select value={filtros[campo]} onChange={(e) => setFiltros((a) => ({ ...a, [campo]: e.target.value }))}><option value="">Todos</option>{(opcoes[campo] ?? []).map((o) => <option key={o}>{o}</option>)}</select></label>)}</div><button className="danger" disabled={selecionados.size === 0} onClick={() => retirar(Array.from(selecionados), alunos.filter((a) => selecionados.has(a.id)).map((a) => a.nome))}>Retirar selecionados</button></section><section className="chart-card"><div className="table-wrap"><table><thead><tr><th>Checkbox</th><th>Nome</th><th>Projeto</th><th>Serviço</th><th>Cidade</th><th>Unidade</th><th>Responsável</th><th>Telefone</th><th>Status</th><th>Ação individual</th></tr></thead><tbody>{alunos.map((a) => <tr key={a.id}><td><input type="checkbox" checked={selecionados.has(a.id)} onChange={() => alternarAluno(a.id)} /></td><td>{a.nome}</td><td>{a.projeto}</td><td>{a.servico}</td><td>{a.cidade}</td><td>{a.unidade}</td><td>{a.responsavel}</td><td>{a.telefone}</td><td>{a.status}</td><td><button onClick={() => retirar([a.id], [a.nome])}>Retirar</button></td></tr>)}</tbody></table></div></section></>;
}
function AlunosRetirados({ alunos, visualizar, reativar, excluir }: { alunos: Atendido[]; visualizar: (a: Atendido) => void; reativar: (a: Atendido) => void; excluir: (a: Atendido) => void }) {
  return <section className="chart-card"><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Projeto</th><th>Serviço</th><th>Cidade</th><th>Unidade</th><th>Responsável</th><th>Telefone</th><th>Data da retirada</th><th>Motivo da retirada</th><th>Observações</th><th>Ações</th></tr></thead><tbody>{alunos.map((a) => <tr key={a.id}><td>{a.nome}</td><td>{a.projeto}</td><td>{a.servico}</td><td>{a.cidade}</td><td>{a.unidade}</td><td>{a.responsavel}</td><td>{a.telefone}</td><td>{a.dataRetirada}</td><td>{a.motivoRetirada}</td><td>{a.observacoesRetirada}</td><td><div className="table-actions"><button onClick={() => visualizar(a)}>Visualizar histórico</button><button onClick={() => reativar(a)}>Reativar aluno</button><button className="danger" onClick={() => excluir(a)}>Excluir definitivamente</button></div></td></tr>)}</tbody></table></div></section>;
}
function ModalRetirada({ modal, form, setForm, onCancel, onConfirm }: { modal: { ids: string[]; nomes: string[] }; form: RetiradaForm; setForm: (f: RetiradaForm) => void; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><section className="modal-panel"><h2>Confirmar retirada</h2><p>{modal.ids.length === 1 ? 'Você está retirando este aluno da lista ativa. O histórico será preservado para relatórios e prestação de contas.' : `Você selecionou ${modal.ids.length} alunos. Informe o motivo e confirme a retirada.`}</p><small>{modal.nomes.join(', ')}</small><label>Motivo da retirada<select value={form.motivoRetirada} onChange={(e) => setForm({ ...form, motivoRetirada: e.target.value })}>{motivosRetirada.map((m) => <option key={m}>{m}</option>)}</select></label><label>Data da retirada<input type="date" value={form.dataRetirada} onChange={(e) => setForm({ ...form, dataRetirada: e.target.value })} /></label><label>Observações da retirada<textarea value={form.observacoesRetirada} onChange={(e) => setForm({ ...form, observacoesRetirada: e.target.value })} /></label><footer><button onClick={onCancel}>Cancelar</button><button className="danger" onClick={onConfirm}>Confirmar retirada</button></footer></section></div>;
}
function Mini({ label, value }: { label: string; value: number }) { return <div className="mini-metric"><strong>{value}</strong><span>{label}</span></div>; }
