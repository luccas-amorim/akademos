# Arquitetura

## Visão geral

```
┌──────────────── APARELHO ─────────────────┐        ┌──────── SERVIDOR ────────┐
│ UI (web / Tauri / Expo)                    │        │ Hono                      │
│   └─ packages/core  (domínio, planejador,  │        │  ├─ /auth  (Better Auth)  │
│        insights)                           │  HTTPS │  ├─ /sync  relay cego     │
│   └─ packages/db    SQLite local           │◄──────►│  ├─ /stats agregados k≥10 │
│   └─ packages/sync  log de ops cifrado     │        │  └─ /registry (espelho)   │
│   └─ packages/importers  PDF + conectores ─┼──► sistema da universidade       │
└────────────────────────────────────────────┘        └───────────────────────────┘
```

## Estrutura do repositório

```
akademos/
  apps/{web,desktop,mobile,server}
  packages/{core,db,sync,importers,ui,i18n}
  registry/instituicoes/<sigla>/{instituicao.yaml, cursos/<curso>/<ano-matriz>.yaml, escala.yaml}
  docs/
```

## Modelo de dados (SQLite local)

Herdado do site original; manter os nomes.

- `instituicao` (id, sigla, nome, escala_id, sistema: 'sigaa'|'jupiter'|'outro')
- `curso` (id, instituicao_id, nome, grau)
- `matriz` (id, curso_id, ano, creditos_total, versao_registro)
- `disciplina` (codigo PK por matriz, matriz_id, nome, creditos, carga_horaria, semestre_sugerido, area, tipo: 'obrigatoria'|'eletiva'|'optativa')
- `prerequisito` (disciplina_codigo, requer_codigo, tipo: 'pre'|'co')
- `aluno` (id local, nome, matricula, curso_id, matriz_id, ingresso 'AAAA/N')
- `cursada` (id, aluno_id, disciplina_codigo, semestre, nota, frequencia, situacao: 'aprovada'|'reprovada'|'cursando'|'trancada'|'aproveitada')
- `oferta` (semestre, disciplina_codigo, turma, professor, vagas, interessados, horarios JSON [{dia,slot}])
- `plano` (id, aluno_id, semestre, turmas JSON, criado_em)
- `objetivo` (id, aluno_id, titulo, principal bool, competencias JSON [{nome, disciplinas[]}])
- `marco` (id, aluno_id, semestre, titulo, feito bool)
- `diario` (id, aluno_id, data, texto, humor)
- `insight_cache` (id, tipo, alvo, severidade, texto, motivo, fonte, calculado_em)
- `_ops` (hlc, tabela, linha_id, coluna, valor) — log para sincronização

Situação "efetiva" de uma disciplina (como no protótipo): `ok` aprovada · `cur` cursando · `lib` liberada (todos os pré-requisitos ok) · `blq` bloqueada · `pend` atrasada (semestre sugerido < atual e não cursada).

## Sincronização

- Cada escrita local gera ops `(HLC, tabela, id, coluna, valor)` — LWW por célula (CRDT simples).
- Lote de ops é cifrado com XChaCha20-Poly1305; chave mestra derivada (Argon2id) da frase de recuperação gerada no cadastro, guardada no keychain/passkey (PRF quando suportado).
- Relay: `POST /sync/push {cursor, blobs[]}`, `GET /sync/pull?since=cursor`. Servidor guarda só blobs opacos por conta.
- Antes de construir, **avaliar Evolu** (SQLite + E2EE + relay prontos). Se atender, adotar e pular a implementação própria.

## Conectores de universidade

Interface em `packages/importers/src/connector.ts`:

```ts
interface Connector {
  id: string; // 'sigaa', 'jupiterweb'
  instituicoes: string[]; // siglas atendidas
  login(cred: Credenciais): Promise<Sessao>;
  historico(s: Sessao): Promise<CursadaBruta[]>;
  oferta?(s: Sessao, semestre: string): Promise<OfertaBruta[]>;
}
```

- Rodam no desktop (Tauri, sem CORS) e mobile. Na web: só importação por PDF/manual.
- Primeiro alvo: **SIGAA** (cobre dezenas de federais). Segundo: JúpiterWeb (USP).
- Scraping frágil por natureza: cada conector tem testes com HTML gravado (`__fixtures__`) e versão.

## Importação por PDF

1. pdf.js extrai itens de texto com coordenadas.
2. Modelo por instituição (YAML no registro) define colunas por regex/posição.
3. Linhas → `CursadaBruta`; correspondência com a matriz por código e, se falhar, por nome (similaridade trigram ≥ 0,8).
4. Tela de revisão (como no protótipo) antes de gravar. OCR (tesseract.js) só se o PDF não tiver texto.

## Motor de insights (`packages/core/insights`)

Cada regra é uma função pura `(ctx) => Insight[]`. Tipos do protótipo:

- `risco`: probabilidade de reprovação por disciplina cursando.
- `lotacao`: turma com interessados > vagas; chance estimada pela faixa de prioridade.
- `correlacao`: nota numa disciplina antecipa outra (r de Pearson da comunidade).
- `carga`: horas semanais/créditos acima do histórico pessoal.
- `carreira`: disciplina que aumenta a aderência ao objetivo.

Fase 1: regras determinísticas. Fase 2: modelo de nota hierárquico (aluno × disciplina × área), treinado no servidor só sobre agregados opt-in; coeficientes publicados como JSON e aplicados no aparelho. Sempre expor intervalo (ex.: "5,8–6,9"), nunca valor pontual.

## Planejador

- Grafo de pré-requisitos (DAG) → caminho crítico até a formatura.
- Previsão de formatura: menor semestre em que todos os créditos fecham respeitando limite de créditos/semestre e oferta histórica (disciplina ofertada só em semestres ímpares etc.).
- Grade: detectar conflito por `(dia, slot)`; otimização opcional com HiGHS (WASM) para sugerir combinação máxima de créditos sem conflito.

## Autenticação

- Conta é opcional (botão "Usar sem conta, só neste aparelho").
- Métodos: passkey (padrão), Google, link mágico por e-mail. Senha só como fallback.
- Ao criar conta: gerar frase de recuperação de 12 palavras, exibir uma vez, exigir confirmação.
- Sair: mantém dados locais; opção separada "Apagar dados deste aparelho".

## Privacidade e LGPD

- Base legal: consentimento para agregados; execução de contrato para sync.
- Exportar tudo (JSON + CSV) e apagar conta em um clique.
- Agregados publicados só com k ≥ 10 e ruído (privacidade diferencial, ε documentado).
