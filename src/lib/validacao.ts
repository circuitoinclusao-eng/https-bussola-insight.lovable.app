import type { RegistroAtendimento } from '../types';

export type AlertaValidacao = { linha: number; campo: string; mensagem: string; severidade: 'alerta' | 'erro' };

export function validarData(valor: string) {
  return Boolean(valor) && !Number.isNaN(Date.parse(valor));
}

export function validarRegistroPlanilha(registro: Partial<RegistroAtendimento>, linha = 1, existentes: RegistroAtendimento[] = []): AlertaValidacao[] {
  const alertas: AlertaValidacao[] = [];
  if (!registro.idPessoa && !registro.nomePessoa) alertas.push({ linha, campo: 'Pessoa', mensagem: 'Registro sem pessoa identificada', severidade: 'erro' });
  if (!registro.dataAtendimento) alertas.push({ linha, campo: 'Data do atendimento', mensagem: 'Registro sem data', severidade: 'erro' });
  if (registro.dataAtendimento && !validarData(registro.dataAtendimento)) alertas.push({ linha, campo: 'Data do atendimento', mensagem: 'Data inválida', severidade: 'erro' });
  if (!registro.grau || registro.grau === 'Não informado') alertas.push({ linha, campo: 'Grau', mensagem: 'Registro sem grau', severidade: 'alerta' });
  if (!registro.tipoDeficiencia || registro.tipoDeficiencia === 'Não informado') alertas.push({ linha, campo: 'Tipo de deficiência', mensagem: 'Registro sem tipo de deficiência', severidade: 'alerta' });
  if (!registro.unidade || !registro.servico) alertas.push({ linha, campo: 'Unidade/Serviço', mensagem: 'Registro sem unidade ou serviço', severidade: 'erro' });
  const duplicado = existentes.some((item) => (registro.idPessoa && item.idPessoa === registro.idPessoa) || (item.nomePessoa === registro.nomePessoa && item.dataAtendimento === registro.dataAtendimento && item.servico === registro.servico));
  if (duplicado) alertas.push({ linha, campo: 'Duplicidade', mensagem: 'Possível duplicidade', severidade: 'alerta' });
  return alertas;
}
