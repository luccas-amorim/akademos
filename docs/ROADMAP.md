# Roadmap — tarefas para o Claude Code

Execute em ordem. Cada item = um PR. Critério de aceite entre colchetes.

## Fase 0 — Fundação (semana 1–2)

- [x] 0.1 Monorepo pnpm + Turborepo, TS strict, ESLint, Prettier, Vitest, GitHub Actions. [CI verde com `lint typecheck test`]
- [x] 0.2 `packages/ui`: tokens de `docs/DESIGN.md` em CSS variables; fontes Source Serif 4, IBM Plex Sans, IBM Plex Mono auto-hospedadas. [página `/kit` mostra cores, tipos, botões]
- [x] 0.3 `apps/web`: Vite + React + TanStack Router; layout com barra lateral de 232px e as 8 rotas vazias. [navegação igual ao protótipo]
- [ ] 0.4 `packages/db`: esquema Drizzle do `ARCHITECTURE.md`, migrações, adaptador wa-sqlite + OPFS. [dados sobrevivem a recarregar a página]
- [ ] 0.5 `registry/`: schema Zod → JSON Schema; uma instituição fictícia "UFX" com a matriz do protótipo. [`pnpm registry:validate`]
- [ ] 0.6 Seed de desenvolvimento com a aluna fictícia "Ana" do protótipo.

## Fase 1 — MVP local (semana 3–6)

- [ ] 1.1 `core`: situação efetiva, integralização, média ponderada, áreas. [testes]
- [ ] 1.2 Tela **Início** (KPIs, "O que merece atenção", "Este semestre", "Por área").
- [ ] 1.3 Tela **Percurso**: matriz por semestre, seleção destaca pré-requisitos (verde-oliva) e o que destrava (âmbar); painel lateral.
- [ ] 1.4 Tela **Desempenho**: média por semestre, por área, risco, correlações.
- [ ] 1.5 Tela **Importar** — entrada manual + parser de PDF com tela de revisão. [importa um histórico SIGAA real anonimizado em `__fixtures__`]
- [ ] 1.6 Modo **Ocultar notas** global (substitui valores por `•,•`).
- [ ] 1.7 Exportar/apagar dados locais.
- [ ] 1.8 PWA instalável e offline. [Lighthouse PWA ok]

## Fase 2 — Planejamento e insights (semana 7–10)

- [ ] 2.1 `core/planner`: DAG, caminho crítico, previsão de formatura. [testes com 3 matrizes]
- [ ] 2.2 Tela **Planejar**: oferta, turmas, grade semanal com conflitos em tempo real, KPIs (créditos, horas, conflitos, formatura) e avisos.
- [ ] 2.3 `core/insights`: as 5 regras determinísticas com `motivo` e `fonte`.
- [ ] 2.4 Tela **Insights** com filtros por tipo.
- [ ] 2.5 Tela **Carreira**: objetivo, competências, aderência, marcos, diário de expectativas.

## Fase 3 — Conta e sincronização (semana 11–14)

- [ ] 3.1 Spike: Evolu vs. implementação própria. Registrar decisão em `docs/adr/0001-sync.md`.
- [ ] 3.2 `apps/server`: Hono + Postgres + Better Auth (passkey, Google, link mágico). Docker Compose.
- [ ] 3.3 Tela **Entrar/Criar conta** conforme o protótipo; frase de recuperação; "Usar sem conta".
- [ ] 3.4 `packages/sync`: ops HLC, cifra, push/pull, indicador "sincronizado há X" na barra lateral.
- [ ] 3.5 Testes e2e: dois navegadores, editar offline, convergir.

## Fase 4 — Conectores e comunidade (semana 15–20)

- [ ] 4.1 `apps/desktop` Tauri 2.
- [ ] 4.2 Conector SIGAA (histórico + oferta + pré-matrícula). Fixtures gravadas.
- [ ] 4.3 Conector JúpiterWeb (USP).
- [ ] 4.4 Consentimento opt-in + envio de agregados anônimos; `/stats` com k ≥ 10.
- [ ] 4.5 Insights com dados da comunidade (risco, correlação, chance de vaga).
- [ ] 4.6 Página pública **Sobre/Apoio**; guia de contribuição do registro.

## Fase 5 — Mobile (semana 21+)

- [ ] 5.1 Expo reusando `core`, `db` (expo-sqlite) e `sync`.
- [ ] 5.2 Telas prioritárias: Início, Percurso, Planejar, Insights.
- [ ] 5.3 Notificações locais (prazo de matrícula, nota lançada).

## Riscos

- Conectores quebram quando a universidade muda o HTML → versionar, testar com fixtures, falhar com elegância para PDF.
- Termos de uso dos sistemas acadêmicos → conectores rodam com credencial do próprio aluno, no aparelho dele; revisar juridicamente antes do lançamento.
- Comunidade pequena no início → insights de comunidade só aparecem acima de k; antes disso, só regras pessoais.
- Perda da frase de recuperação = perda dos dados sincronizados → deixar isso explícito no cadastro.
