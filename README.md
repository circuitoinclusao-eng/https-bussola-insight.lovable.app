# Circuito Conecta — integração real padrão Bússola

Plataforma operacional integrada para que cadastros, atividades, frequências, atendimentos, relatórios e indicadores sejam alimentados por dados reais do Supabase.

## Como executar

1. Configure as variáveis de ambiente:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

2. Instale dependências e rode a aplicação:

```bash
npm install
npm run dev
```

3. Aplique as migrations em ordem:

- `supabase/migrations/202606030001_bussola_integrated_schema.sql`
- `supabase/migrations/202606030002_painel_integrado_views.sql`

## Fluxo implementado

- Dashboard principal consome apenas views agregadas Supabase, sem números mockados.
- Painel Integrado possui filtros por ano, mês, projeto, cidade, polo, modalidade e patrocinador, com cards e gráficos agregados sem expor nomes de pessoas, CPF, telefone, endereço, laudos, responsáveis, datas de nascimento individuais ou observações individuais.
- Indicadores possuem filtros por ano, mês, projeto, cidade, polo, modalidade, patrocinador e fonte de recurso.
- Relatórios automáticos podem filtrar por projeto, cidade e período, com exportação PDF e Excel.
- Importação CSV/Excel valida campos obrigatórios e duplicidades antes de registrar log de importação.
- Serviços de operação em `src/lib/operations.ts` centralizam cadastros para editais, projetos, atendidos, grupos, atividades, frequência, atendimentos e CRM, sempre persistindo no Supabase para refletir nas views.

## Segurança e LGPD

A migration cria tabelas operacionais, perfis, RLS, logs de acesso, logs de importação, canal de solicitação de dados, termos LGPD e termo de imagem. Perfis suportados: administrador, coordenação, professor, financeiro, comunicação, patrocinador e consulta pública.

RLS fica ativo nas tabelas base `atendidos`, `atendimentos`, `atividades`, `frequencias`, `projetos`, `grupos` e `relacionamento`. As views do Painel Integrado são liberadas apenas para `authenticated`; `anon` permanece restrito às views públicas 100% agregadas listadas abaixo.

## Views seguras para Power BI

Estas views são agregadas e não retornam campos pessoais ou sensíveis. Podem ser usadas em painéis e Power BI conforme a política de acesso indicada:

### Públicas (`anon` e `authenticated`)

- `vw_dashboard_geral`
- `vw_atividades_mensais`
- `vw_projetos_status`
- `vw_atendidos_por_cidade`
- `vw_atendimentos_por_tipo`

### Internas (`authenticated`)

- `vw_atendidos_por_projeto`
- `vw_frequencia_por_projeto`
- `vw_ocupacao_por_grupo`
- `vw_impacto_social`
- `vw_recursos_por_projeto`
- `vw_painel_pessoas`
- `vw_painel_atendimentos`
- `vw_painel_atividades`
- `vw_painel_grupos`
- `vw_painel_condicoes`
- `vw_painel_frequencia_projeto`
- `vw_painel_ocupacao_turma`
- `vw_painel_projetos_status`

## Views e tabelas que não devem ser usadas em Power BI público

Não conecte Power BI público diretamente às tabelas base nem a objetos que possam conter dados individualizados. Em especial, não usar publicamente:

- `atendidos`
- `atendimentos`
- `frequencias`
- `atividades`
- `documentos`
- `usuarios`
- `relacionamento`
- `logs_acesso`
- `relatorios` quando `publico = false`

Essas tabelas podem conter nome, CPF, telefone, endereço/bairro, laudo, data de nascimento individual, observações restritas, justificativas ou histórico operacional não agregado.
