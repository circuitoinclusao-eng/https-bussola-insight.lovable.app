import type { FiltrosGerenciais, LogProcessamento, RegistroAtendimento, ResumoGrau, SerieValor } from '../types';
import { padronizarGrau, padronizarSexo, padronizarTipoDeficiencia, textoOuNaoInformado } from './normalizacao';
import { validarRegistroPlanilha } from './validacao';

export function aplicarRegrasLimpeza(registro: RegistroAtendimento): RegistroAtendimento {
  return {
    ...registro,
    idPessoa: textoOuNaoInformado(registro.idPessoa),
    nomePessoa: textoOuNaoInformado(registro.nomePessoa),
    tipoDeficiencia: padronizarTipoDeficiencia(registro.tipoDeficiencia),
    grau: padronizarGrau(registro.grau),
    unidade: textoOuNaoInformado(registro.unidade),
    territorio: textoOuNaoInformado(registro.territorio),
    servico: textoOuNaoInformado(registro.servico),
    projeto: textoOuNaoInformado(registro.projeto),
    sexo: padronizarSexo(registro.sexo),
    cidade: textoOuNaoInformado(registro.cidade),
    origemFonte: textoOuNaoInformado(registro.origemFonte),
  };
}

export function validarRegistro(registro: RegistroAtendimento, linha = 1, existentes: RegistroAtendimento[] = []) {
  return validarRegistroPlanilha(registro, linha, existentes);
}

export function removerDuplicidades(registros: RegistroAtendimento[]) {
  const vistos = new Set<string>();
  return registros.filter((registro) => {
    const chavePessoa = registro.idPessoa ? `pessoa:${registro.idPessoa}` : '';
    const chaveAtendimento = `${registro.nomePessoa}|${registro.dataAtendimento}|${registro.servico}`.toLowerCase();
    const chave = chavePessoa || chaveAtendimento;
    if (vistos.has(chave) || vistos.has(chaveAtendimento)) return false;
    vistos.add(chave);
    vistos.add(chaveAtendimento);
    return true;
  });
}

export function calcularResumoConsolidacao(registros: RegistroAtendimento[]) {
  const alertas = registros.filter((item) => item.statusValidacao === 'Alerta').length;
  const incompletas = registros.filter((item) => item.statusValidacao === 'Incompleto').length;
  const duplicidades = registros.length - removerDuplicidades(registros).length;
  return {
    linhasValidas: registros.filter((item) => item.statusValidacao === 'Válido').length,
    linhasComAlerta: alertas,
    linhasIncompletas: incompletas,
    possiveisDuplicidades: duplicidades,
    camposNaoReconhecidos: 2,
  };
}

export function gerarLogsProcessamento(fonte: string, registros: RegistroAtendimento[]): LogProcessamento[] {
  const resumo = calcularResumoConsolidacao(registros);
  return [{
    id: `log-${Date.now()}`,
    dataHora: new Date().toISOString(),
    fonte,
    status: resumo.linhasIncompletas ? 'Com alerta' : 'Sucesso',
    mensagem: 'Processamento executado com limpeza, padronização e checagem de duplicidades.',
    linhasProcessadas: registros.length,
    quantidadeErros: resumo.linhasIncompletas + resumo.possiveisDuplicidades,
  }];
}

export function consolidarRegistros(registros: RegistroAtendimento[]) {
  const limpos = registros.map(aplicarRegrasLimpeza);
  const consolidados = removerDuplicidades(limpos).map((registro, index, lista) => {
    const alertas = validarRegistro(registro, index + 2, lista.slice(0, index));
    return { ...registro, statusValidacao: alertas.some((alerta) => alerta.severidade === 'erro') ? 'Incompleto' : alertas.length ? 'Alerta' : 'Válido' } satisfies RegistroAtendimento;
  });
  return { registros: consolidados, resumo: calcularResumoConsolidacao(consolidados), logs: gerarLogsProcessamento('Processamento local', consolidados) };
}

function dentroPeriodo(data: string, inicio?: string, fim?: string) {
  return (!inicio || data >= inicio) && (!fim || data <= fim);
}

export function filtrarRegistros(registros: RegistroAtendimento[], filtros: FiltrosGerenciais) {
  return registros.filter((registro) => dentroPeriodo(registro.dataAtendimento, filtros.inicio, filtros.fim)
    && (!filtros.projeto || registro.projeto === filtros.projeto)
    && (!filtros.unidade || registro.unidade === filtros.unidade)
    && (!filtros.cidade || registro.cidade === filtros.cidade)
    && (!filtros.territorio || registro.territorio === filtros.territorio)
    && (!filtros.servico || registro.servico === filtros.servico)
    && (!filtros.tipoDeficiencia || registro.tipoDeficiencia === filtros.tipoDeficiencia)
    && (!filtros.grau || registro.grau === filtros.grau)
    && (!filtros.sexo || registro.sexo === filtros.sexo)
    && (!filtros.faixaEtaria || registro.faixaEtaria === filtros.faixaEtaria));
}

export function contarPessoasUnicas(registros: RegistroAtendimento[]) {
  return new Set(registros.map((registro) => registro.idPessoa)).size;
}

export function agruparPor(registros: RegistroAtendimento[], campo: keyof RegistroAtendimento): SerieValor[] {
  const mapa = new Map<string, Set<string>>();
  registros.forEach((registro) => {
    const chave = String(registro[campo] || 'Não informado');
    if (!mapa.has(chave)) mapa.set(chave, new Set());
    mapa.get(chave)?.add(registro.idPessoa);
  });
  const totalPessoas = contarPessoasUnicas(registros) || 1;
  return Array.from(mapa.entries()).map(([nome, pessoas]) => ({ nome, total: pessoas.size, percentual: Math.round((pessoas.size / totalPessoas) * 100) })).sort((a, b) => b.total - a.total);
}

export function evolucaoMensal(registros: RegistroAtendimento[]) {
  const mapa = new Map<string, number>();
  registros.forEach((registro) => {
    const mes = registro.dataAtendimento.slice(0, 7);
    mapa.set(mes, (mapa.get(mes) ?? 0) + 1);
  });
  return Array.from(mapa.entries()).map(([mes, total]) => ({ mes, total })).sort((a, b) => a.mes.localeCompare(b.mes));
}

export function evolucaoMensalPorGrau(registros: RegistroAtendimento[]) {
  const mapa = new Map<string, Record<string, string | number>>();
  registros.forEach((registro) => {
    const mes = registro.dataAtendimento.slice(0, 7);
    if (!mapa.has(mes)) mapa.set(mes, { mes, Leve: 0, Moderado: 0, 'Grave/Severo': 0, 'Não informado': 0 });
    const linha = mapa.get(mes);
    if (linha) linha[registro.grau] = Number(linha[registro.grau] ?? 0) + 1;
  });
  return Array.from(mapa.values()).sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
}

function top(registros: RegistroAtendimento[], campo: keyof RegistroAtendimento, grau: string) {
  return agruparPor(registros.filter((registro) => registro.grau === grau), campo).slice(0, 2).map((item) => item.nome).join(', ') || 'Não informado';
}

export function resumoPorGrau(registros: RegistroAtendimento[]): ResumoGrau[] {
  const totalPessoas = contarPessoasUnicas(registros) || 1;
  return agruparPor(registros, 'grau').map((item) => ({
    ...item,
    percentual: Math.round((item.total / totalPessoas) * 100),
    atendimentos: registros.filter((registro) => registro.grau === item.nome).length,
    tiposFrequentes: top(registros, 'tipoDeficiencia', item.nome),
    cidadesConcentracao: top(registros, 'cidade', item.nome),
    servicosAcessados: top(registros, 'servico', item.nome),
  }));
}
