# Contribuindo com o Akademos

Obrigado por querer ajudar. Há três jeitos principais:

1. **Adicionar ou corrigir a matriz do seu curso** — só YAML, sem código.
   Guia: [docs/registro.md](docs/registro.md).
2. **Manter um conector** do sistema acadêmico da sua universidade (SIGAA, JúpiterWeb…), em
   `packages/importers/src/conectores/`. Todo conector tem testes com HTML gravado em
   `__fixtures__` (sintético ou anonimizado) e uma `versao` que sobe quando o HTML muda.
3. **Código e design** — leia [CLAUDE.md](CLAUDE.md) (regras e stack),
   [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/ROADMAP.md](docs/ROADMAP.md).

## Ambiente

```bash
pnpm i
pnpm dev                 # app web em http://localhost:5173
pnpm dev:server          # API opcional em http://localhost:8787 (PGlite, sem Docker)
pnpm test                # Vitest em todos os pacotes
pnpm e2e                 # Playwright (sobe API e app sozinho)
pnpm lint && pnpm typecheck
pnpm registry:validate
```

## Regras que não mudam

- Local primeiro: tudo funciona offline; nada de rede no caminho crítico da UI.
- O servidor nunca recebe nota, histórico ou credencial em claro.
- `packages/core` é TypeScript puro e toda função dele tem teste; toda regra de insight tem
  caso positivo e negativo, e todo insight mostra `motivo` e `fonte`.
- Interface em português do Brasil, com Lingui.
- Commits no formato Conventional Commits; um PR por tarefa do roadmap.
- **Nunca** commite histórico escolar, documento ou dado pessoal real, nem como fixture.
