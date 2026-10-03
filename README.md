# Akademos

<sub>O nome vem de Akademos, o herói do bosque onde Platão fundou a Academia. [Por quê?](MITO.md)</sub>

**Gestão acadêmica aberta: grade curricular, horário, notas, integralização e progresso do curso, num
site que se adapta à matriz da sua universidade.**

Akademos é o herói ateniense cujo bosque abrigou a Academia de Platão. Este projeto quer ser esse
lugar para a vida acadêmica de cada estudante: um só endereço onde a matriz curricular, o horário do
semestre, as notas e o caminho até a formatura conversam entre si, derivados de uma única fonte de
dados que o próprio estudante controla.

> **Estágio: rascunho.** Nasceu como o planejamento pessoal de um curso de Direito e está sendo
> separado dos dados de quem o criou para virar ferramenta de qualquer estudante, de qualquer curso.
> O código já está aqui, com uma matriz de exemplo fictícia publicada em
> [luccas-amorim.github.io/akademos](https://luccas-amorim.github.io/akademos/); para usar com o
> seu curso, veja [Como usar](#como-usar).

---

## O que já existe

Um site estático (Docusaurus) em que tudo é derivado de três arquivos de dados:

| Arquivo | O que guarda |
|---|---|
| `curriculo.json` | a matriz: disciplinas, séries, créditos, carga horária, áreas, situação de cada uma |
| `horario.json` | as aulas de cada semestre letivo, por dia e faixa de horário |
| `notas.json` | as notas lançadas e a regra de média do curso |

A partir deles, o site monta:

- **Painel de progresso**: créditos e carga horária cumpridos, por área e no total.
- **Calculadora de notas**: média ponderada por créditos, com a regra de aprovação do curso.
- **Horário da semana**, cruzado com a matriz, apontando conflitos e noites livres.
- **Planejamento de integralização**: o que cursar em cada semestre até a formatura, em mais de um
  cenário quando houver escolhas a fazer.
- **Validadores** que conferem a matriz (créditos, cargas, códigos) e impedem que uma página seja
  publicada por acidente.

## Como usar

O repositório vem com um curso **fictício** de exemplo ("Curso de Exemplo", 6 séries, 24
disciplinas). Para modelar o seu, só se editam dados — nenhum componente precisa mudar.

**1. Edite os três arquivos em `src/data/`.**

- `curriculo.json`
  - `meta`: nome do curso, número de séries, semestre atual e totais exigidos (créditos e CH).
  - `config`: as regras da sua universidade e da sua rotina — dias de aula, faixas de horário por
    dia, créditos por faixa, horas por crédito, quantos dias livres você quer manter e como chamá-los
    ("noite", "manhã", "dia").
  - `disciplinas`: código, nome, série, créditos, área e `status` (`cursada`, `aproveitada`,
    `cursando`, `adiada` ou `pendente`). O que ainda falta cursar leva `plano`: o semestre previsto
    em cada rota.
  - `cenarios`: uma ou mais rotas até a formatura. Com uma rota só, deixe `troncoComum` vazio.
  - `eletivas` e `calendario`: as vagas de eletiva e o ordinal de cada semestre letivo.
- `horario.json`: as faixas do dia e, por semestre, as aulas (código, dia, faixas, sala, docente).
- `notas.json`: a regra de aprovação (`config`) e as notas, pelo código da disciplina.

**2. Rode localmente** (Node 24 ou mais recente):

```bash
npm ci
npm run validate   # confere se os três arquivos concordam entre si
npm start          # abre o site em http://localhost:3000/akademos/
```

`npm run validate` aponta choque de horário, créditos que não fecham, nota fora da escala, rota
que não integraliza o curso e página publicada sem link.

**3. Publique no GitHub Pages.**

1. Faça um fork e, em `docusaurus.config.ts`, troque `url`, `baseUrl`, `organizationName` e
   `projectName` pelo seu usuário e pelo nome do seu repositório.
2. Em *Settings → Pages*, escolha **GitHub Actions** como fonte.
3. Cada push em `main` valida, compila e publica o site pelo workflow
   `.github/workflows/deploy.yml`.

> Notas e histórico são dados pessoais, e o site publicado é público mesmo que o repositório seja
> privado. Publique só o que você aceitaria mostrar.

## Para onde vai, com apoio

O rascunho funciona para quem sabe editar um JSON. Para servir a qualquer estudante, precisa de:

- **Contas e login**, para cada estudante manter seus próprios dados sem mexer em código.
- **Adaptadores por universidade**: importar a matriz e o histórico escolar a partir do que cada
  instituição publica ou emite (PDF do histórico, páginas da matriz, sistemas acadêmicos).
- **Vários cursos e matrizes**, inclusive troca de matriz e aproveitamento de disciplinas em
  transferências.
- **Privacidade por padrão**: notas e histórico são dados pessoais. A primeira opção é guardar tudo no
  aparelho do estudante; qualquer armazenamento em servidor seguirá a LGPD, com consentimento e
  exclusão a pedido.

É o projeto da lista que pede o maior financiamento: login, armazenamento seguro e importadores são
bem mais complexos que um site estático.

Apoie em [GitHub Sponsors](https://github.com/sponsors/luccas-amorim) ou por
[PIX](https://luccas-amorim.github.io/apoie/).

## Licença

[MIT](LICENSE).
