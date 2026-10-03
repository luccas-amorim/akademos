# Akademos

**Gestão acadêmica aberta: grade curricular, horário, notas, integralização e progresso do curso, num
site que se adapta à matriz da sua universidade.**

Akademos é o herói ateniense cujo bosque abrigou a Academia de Platão. Este projeto quer ser esse
lugar para a vida acadêmica de cada estudante: um só endereço onde a matriz curricular, o horário do
semestre, as notas e o caminho até a formatura conversam entre si, derivados de uma única fonte de
dados que o próprio estudante controla.

> **Estágio: rascunho.** Nasceu como o planejamento pessoal de um curso de Direito e está sendo
> separado dos dados de quem o criou para virar ferramenta de qualquer estudante, de qualquer curso.
> O código chega a este repositório em seguida, já com uma matriz de exemplo fictícia.

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
