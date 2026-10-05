# CLAUDE.md — Akademos

Instruções permanentes para o Claude Code neste repositório. Leia antes de qualquer tarefa.

## O que é

Akademos é uma plataforma de código aberto para o estudante acompanhar seu percurso acadêmico: histórico, matriz curricular com pré-requisitos, planejamento de matrícula, previsões de desempenho e alinhamento com a carreira. Funciona para qualquer universidade: a instituição é dado (pacote declarativo), não código.

## Regras inegociáveis

1. **Local primeiro.** O banco SQLite no aparelho é a fonte da verdade. Toda funcionalidade precisa funcionar offline. Nada de chamada de rede no caminho crítico da UI.
2. **Cifra de ponta a ponta.** O servidor nunca recebe nota, histórico ou credencial de universidade em claro. A chave de cifra é derivada no aparelho e nunca é enviada.
3. **Credenciais de universidade** só existem no aparelho (keychain do SO / IndexedDB cifrado). Conectores rodam no cliente.
4. **Domínio puro.** `packages/core` não importa React, DOM, Node nem SQLite diretamente. Recebe repositórios por injeção.
5. **Insights explicáveis.** Todo insight exibido carrega `motivo` (texto) e `fonte` (pessoal | comunidade | regra). Sem caixa-preta.
6. **Comunidade é opt-in.** Agregados anônimos só com consentimento explícito, com k-anonimato mínimo k=10 por célula.
7. **Português do Brasil** em toda a UI, via Lingui (preparar i18n desde o início).
8. **Fidelidade ao design.** `design/Akademos.dc.html` é a referência visual. Use os tokens de `docs/DESIGN.md`; não invente cores, fontes ou raios.

## Stack

- Monorepo pnpm + Turborepo, TypeScript `strict`, ESM.
- `apps/web`: React 19 + Vite, PWA (vite-plugin-pwa), TanStack Router, TanStack Query só para chamadas ao servidor.
- `apps/desktop`: Tauri 2 empacotando `apps/web`.
- `apps/mobile`: Expo (fase 5).
- `apps/server`: Hono + Postgres (Drizzle), Better Auth.
- `packages/core`: domínio, planejador, motor de insights (TS puro).
- `packages/db`: esquema Drizzle (SQLite) + migrações; adaptadores wa-sqlite/OPFS (web), tauri-plugin-sql, expo-sqlite.
- `packages/sync`: log de operações, cifra (libsodium-wrappers), cliente do relay.
- `packages/importers`: parser de PDF (pdf.js, tesseract.js opcional), conectores.
- `packages/ui`: componentes (React Aria) + tokens em CSS variables.
- `registry/`: matrizes e escalas em YAML, validadas por JSON Schema gerado do Zod.
- Testes: Vitest (unidade), Playwright (e2e). CI: GitHub Actions.

## Comandos

```
pnpm i
pnpm dev            # web em http://localhost:5173
pnpm dev:server     # API em http://localhost:8787
pnpm test           # vitest em todos os pacotes
pnpm e2e            # playwright
pnpm lint && pnpm typecheck
pnpm registry:validate
```

## Convenções

- Nomes de domínio em português, como no design: `Disciplina`, `Matriz`, `Turma`, `Cursada`, `Insight`, `Objetivo`.
- Identificadores no código em inglês só para infraestrutura (`repo`, `adapter`, `sync`).
- Datas de semestre como string `AAAA/N` (ex.: `2027/1`). Notas como `number` na escala da instituição; normalizar para 0–10 apenas no motor de insights.
- Toda função do `core` tem teste. Toda regra de insight tem teste com caso positivo e negativo.
- Commits: Conventional Commits. Um PR por tarefa do `docs/ROADMAP.md`.

## Como trabalhar

- Antes de codar uma tela, abra `design/Akademos.dc.html` no navegador e leia a seção correspondente em `README.md`.
- Siga a ordem do `docs/ROADMAP.md`. Marque a tarefa concluída no próprio arquivo.
- Na dúvida entre duas soluções, escolha a que mantém o servidor mais burro.
