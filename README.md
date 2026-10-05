# Akademos

<sub>O nome vem de Akademos, o herói do bosque onde Platão fundou a Academia. [Por quê?](MITO.md)</sub>

**Seu percurso acadêmico, do primeiro semestre à formatura.** Histórico, matriz curricular com
pré-requisitos, planejamento de matrícula, previsões e alinhamento com a carreira — calculados no
seu aparelho, para qualquer curso de qualquer universidade.

**Experimente:** [luccas-amorim.github.io/akademos](https://luccas-amorim.github.io/akademos/) →
"Explorar com a aluna de exemplo". A publicação no GitHub Pages não tem servidor: tudo roda no
navegador e os dados de exemplo (aluna Ana, Universidade Federal de Exemplo) são fictícios.

> **Estágio: beta, ainda sem uso real.** As instituições do registro são fictícias até que
> estudantes contribuam com as matrizes reais dos seus cursos.

---

## O que faz

| Tela | O que mostra |
|---|---|
| **Início** | Integralização, média ponderada, formatura prevista, horas da semana, o que merece atenção, risco das disciplinas em curso e progresso por área. |
| **Percurso** | A matriz por semestre. Ao escolher uma disciplina, destaca o que ela exige (verde-oliva) e o que destrava (âmbar). |
| **Planejar** | Oferta do próximo semestre, lotação e chance de vaga, grade semanal com conflitos em tempo real e o impacto de cada escolha na data de formatura. |
| **Insights** | Formatura em risco, risco de reprovação, turmas que vão lotar, correlações entre disciplinas, carga do semestre e aderência à carreira. Todo insight mostra **por quê** e **de onde** vem. |
| **Desempenho** | Médias por semestre e por área, tabela de risco e correlações. |
| **Carreira** | Objetivo, competências, aderência, marcos até a formatura e diário de expectativas. |
| **Importar** | PDF do histórico (lido no aparelho), conector do sistema acadêmico (desktop) ou entrada manual. |

## Princípios

- **Local primeiro.** O banco é um SQLite no aparelho (OPFS no navegador). Tudo funciona offline,
  inclusive como PWA instalável.
- **Cifra de ponta a ponta.** Conta é opcional. Com ela, os dados são cifrados no aparelho
  (XChaCha20-Poly1305, chave derivada por Argon2id de uma frase de 12 palavras) e o servidor só
  guarda blobs ilegíveis.
- **Credenciais da universidade nunca saem do aparelho.** Os conectores (SIGAA, JúpiterWeb)
  rodam no app de desktop, com a credencial do próprio aluno.
- **Comunidade opt-in.** Quem quiser compartilha notas anônimas; agregados só com k ≥ 10 por
  célula e ruído estatístico.
- **A instituição é dado, não código.** Matrizes, escalas e modelos de histórico são YAML no
  [registro](registry/), validados em CI.

## Como usar

- **Web:** abra o endereço acima, ou rode localmente (`pnpm dev`). Instale como app pelo navegador.
- **Desktop (Windows, macOS, Linux):** instaladores gerados pelo workflow *Desktop (Tauri)*;
  necessários para usar os conectores. Veja [apps/desktop](apps/desktop/README.md).
- **Celular (Android, iOS):** app Expo em [apps/mobile](apps/mobile/README.md).
- **Servidor (opcional):** contas, sincronização e agregados — `docker compose up`. Veja
  [apps/server](apps/server/README.md).

### Seu curso não está no registro?

Adicione a matriz com um pull request, só com YAML: [guia do registro](docs/registro.md).

## Desenvolvimento

```bash
pnpm i
pnpm dev            # app web em http://localhost:5173
pnpm dev:server     # API em http://localhost:8787 (PGlite, sem Docker)
pnpm test           # Vitest em todos os pacotes
pnpm e2e            # Playwright: dois navegadores sincronizando, uso sem conta, planejamento
pnpm lint && pnpm typecheck
pnpm registry:validate
```

| Pasta | Conteúdo |
|---|---|
| `apps/web` | React 19 + Vite + TanStack Router + Lingui, PWA |
| `apps/desktop` | Tauri 2 (HTTP sem CORS para conectores, chaveiro do sistema) |
| `apps/mobile` | Expo (expo-sqlite, notificações locais) |
| `apps/server` | Hono + Postgres (Drizzle) + Better Auth; relay cego e `/stats` |
| `packages/core` | Domínio puro: percurso, planejador, motor de insights |
| `packages/db` | Esquema Drizzle (SQLite), migrações, log de operações, adaptadores |
| `packages/sync` | HLC, cifra, protocolo de sincronização |
| `packages/importers` | Parser de PDF, correspondência com a matriz, conectores |
| `packages/ui` | Tokens de design e componentes (React Aria) |
| `registry/` | Instituições, escalas e matrizes em YAML |

Arquitetura e decisões: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/adr](docs/adr), [docs/ROADMAP.md](docs/ROADMAP.md). Como contribuir:
[CONTRIBUTING.md](CONTRIBUTING.md).

## Apoie

Sem anúncios e sem venda de dados. Hospedagem do sync, revisão de segurança e publicação nas
lojas dependem de patrocínio: [GitHub Sponsors](https://github.com/sponsors/luccas-amorim) ou
[PIX](https://luccas-amorim.github.io/apoie/).

## Licença

[MIT](LICENSE).
