# Design — tokens e padrões

Fidelidade: **alta**. Recriar fielmente usando `packages/ui`.

## Cores

| Token             | Hex                                   | Uso                                       |
| ----------------- | ------------------------------------- | ----------------------------------------- |
| `--bg`            | #f6f5f1                               | fundo da página                           |
| `--surface`       | #fffefb                               | cartões, barra lateral                    |
| `--border`        | #e4e1d8                               | bordas de cartões                         |
| `--border-soft`   | #ecebe5                               | divisores internos, trilhos de barra      |
| `--input-border`  | #d6d3c8                               | campos                                    |
| `--ink`           | #1b1d22                               | texto principal                           |
| `--ink-2`         | #5d6068                               | texto secundário                          |
| `--ink-3`         | #8a8c92                               | texto terciário                           |
| `--primary`       | #1e3a8a                               | marca, links, seleção, barras             |
| `--primary-hover` | #13265e                               | hover de link                             |
| `--primary-tint`  | #e7ebf6                               | item de navegação ativo, células da grade |
| `--olive`         | #5a6e2e                               | barras de área, pré-requisito             |
| `--olive-ink`     | #4f6428                               | texto positivo                            |
| `--amber`         | #c98a2b / texto #8f5309               | alerta, "destrava", badges                |
| `--danger`        | #a33a2a, fundo #f8e3df, texto #7d2a1d | risco, conflito                           |

## Tipografia

- Títulos: **Source Serif 4** 600. H1 34px (Início) / 30px (demais), letter-spacing −0,015em. H2 19–21px. Números de KPI 32px.
- Texto: **IBM Plex Sans** 400/500/600, 14–15px; legendas 12–13px.
- Códigos, notas, horários: **IBM Plex Mono** 10–12px.
- Rótulos de seção: 12px maiúsculas, letter-spacing 0,06em, `--ink-2`.

## Forma

- Raios: cartão 10px, botão/campo 8px, chip 6–7px, pílula 10px.
- Bordas 1px; sem sombras (seleção usa `box-shadow: 0 0 0 2px <cor>` como anel).
- Espaçamento: 4/6/8/10/12/14/16/18/20/24/28px. Conteúdo com `max-width: 1200px`.
- Barra lateral: 232px fixa, sticky.
- Barras de progresso: altura 4–6px, trilho `--border-soft`.

## Telas (ver `design/Akademos.dc.html`)

1. **Entrar** — duas colunas: painel azul (#1e3a8a) com proposta de valor e três pilares numerados; formulário com abas Entrar/Criar conta, passkey (botão escuro), Google, e-mail institucional, e-mail+senha, e "Usar sem conta, só neste aparelho →" (leva a Importar).
2. **Início** — saudação, 4 KPIs, insights urgentes, disciplinas cursando com risco, progresso por área.
3. **Percurso** — colunas por semestre; cartão de disciplina com código, nota, nome, etiqueta; borda tracejada = bloqueada; painel lateral com detalhes, pré-requisitos e o que destrava.
4. **Planejar** — KPIs; lista de oferta com turmas (lotação, chance, botão Adicionar/Na grade ✓); grade semanal seg–sex com conflitos em vermelho; avisos de impacto na formatura.
5. **Insights** — filtros (Todos, Risco, Lotação, Correlação, Carga, Carreira); cartões com tipo, texto, motivo e ação.
6. **Desempenho** — média por semestre, por área, tabela de risco, correlações.
7. **Carreira** — objetivo principal + alternativa, aderência %, competências, marcos, diário.
8. **Importar** — três métodos (PDF, conector, manual); revisão das linhas lidas com correspondência à matriz.
9. **Sobre/Apoio** — página pública do projeto.

## Interações

- Seleção de disciplina no Percurso: anel azul na selecionada, verde-oliva nos pré-requisitos, âmbar no que ela destrava.
- Planejar: escolher uma turma remove outra turma da mesma disciplina; conflitos e KPIs recalculam na hora.
- Ocultar notas: troca todos os valores numéricos de nota por `•,•`.
- Sair: volta para Entrar, sem apagar dados locais.

## Conteúdo

Todos os dados do protótipo são fictícios (aluna Ana, UFX, códigos EXnnn). Use-os como seed de desenvolvimento.
