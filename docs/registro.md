# Como adicionar o seu curso ao registro

O Akademos não tem nenhuma universidade "no código". Cada instituição é um pacote de arquivos
YAML em `registry/instituicoes/<sigla>/`. Se o seu curso não está lá, você pode adicioná-lo com
um pull request — não precisa saber programar.

## Estrutura

```
registry/instituicoes/<sigla>/
  instituicao.yaml          # nome, sistema acadêmico, escala, limite de créditos, grade semanal
  escala.yaml               # escala de notas e regra de aprovação
  historico-pdf.yaml        # (opcional) como ler o PDF do histórico
  cursos/<curso>/<ano>.yaml # a matriz: disciplinas, créditos, pré-requisitos
```

A pasta tem o nome da sigla em minúsculas (`ufx`, `usp`). Os editores com suporte a YAML
(VS Code com a extensão Red Hat YAML, por exemplo) validam enquanto você digita, pela linha
`# yaml-language-server: $schema=…` no topo de cada arquivo.

## 1. `instituicao.yaml`

```yaml
# yaml-language-server: $schema=../../schema/instituicao.schema.json
sigla: UFX
nome: Universidade Federal de Exemplo
sistema: sigaa            # sigaa | jupiter | outro
escala: ufx-0-10          # id de uma escala em escala.yaml
creditos_max_semestre: 24 # usado pela previsão de formatura
grade:
  dias: [seg, ter, qua, qui, sex]
  faixas:                 # blocos de aula do dia, na ordem
    - { inicio: '08:00', fim: '10:00' }
    - { inicio: '10:00', fim: '12:00' }
conector:                 # opcional: só se houver conector para o sistema
  base: https://sigaa.ufx.br
  departamentos: ['1234'] # ids da consulta pública de turmas
```

## 2. `escala.yaml`

```yaml
escalas:
  - id: ufx-0-10
    nome: Nota de 0 a 10
    min: 0
    max: 10
    aprovacao: 6
    frequencia_minima: 0.75
```

## 3. A matriz: `cursos/<curso>/<ano>.yaml`

```yaml
curso: { id: eng-computacao, nome: Engenharia de Computação, grau: bacharelado }
ano: 2019
versao: '1.0.0'            # suba a versão a cada correção
creditos_total: 128
horas_por_credito: 15      # carga horária = créditos × isto, salvo carga_horaria explícita
disciplinas:
  - { codigo: EX101, nome: Cálculo I, creditos: 4, semestre: 1, area: Matemática, codigos_alternativos: [MAT0101] }
  - { codigo: EX201, nome: Cálculo II, creditos: 4, semestre: 2, area: Matemática, requer: [EX101] }
  - { codigo: EX404, nome: Sinais e Sistemas, creditos: 4, semestre: 4, area: Eletrônica, requer: [EX301], oferta: impar }
```

Campos de cada disciplina:

| Campo | Para quê |
|---|---|
| `codigo` | Código na matriz, em maiúsculas. |
| `semestre` | Semestre sugerido (1 = primeiro). |
| `area` | Agrupa o progresso e as médias (Matemática, Computação…). |
| `requer` | Pré-requisitos (códigos desta matriz). |
| `correquisitos` | Precisam ser cursadas junto ou antes. |
| `tipo` | `obrigatoria` (padrão), `eletiva` ou `optativa` (optativas não entram na soma). |
| `oferta` | `ambos` (padrão), `impar` (só em /1) ou `par` (só em /2): pesa na previsão de formatura. |
| `codigos_alternativos` | Como a disciplina aparece no histórico ou no sistema, se for diferente. |

## 4. (Opcional) Ler o PDF do histórico

`historico-pdf.yaml` diz como reconhecer uma linha de disciplina no PDF, com uma expressão
regular de grupos nomeados (`semestre`, `codigo`, `nome`, `nota`, `frequencia`, `situacao`) e o
significado de cada situação:

```yaml
sistema: sigaa
linha: '^(?<semestre>\d{4}\.[12])\s+(?<codigo>[A-Z]{3}\d{4})\s+(?<nome>.+?)\s+(?<ch>\d+)\s+(?<turma>\S+)\s+(?<frequencia>\d{1,3},\d|--)\s+(?<nota>\d{1,2},\d|--)\s+(?<situacao>[A-Z]+)$'
separador_decimal: ','
situacoes: { APR: aprovada, REP: reprovada, MATR: cursando, TRANC: trancada, CUMP: aproveitada }
```

**Nunca** inclua o seu histórico real no repositório. Para testar, gere um PDF sintético (veja
`packages/importers/scripts/gerar-fixtures.ts`).

## 5. Validar

```bash
pnpm i
pnpm registry:validate
```

O validador confere o formato (JSON Schema gerado do Zod) e a coerência: pré-requisito que não
existe, ciclo de pré-requisitos, créditos que não fecham, pasta com nome diferente da sigla.
Avisos (⚠) não impedem o uso; erros (✖) sim. O CI roda o mesmo comando em cada pull request.
