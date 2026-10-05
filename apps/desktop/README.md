# @akademos/desktop

App de desktop (Tauri 2) que empacota `apps/web`. Existe por dois motivos:

1. **Conectores**: o navegador não deixa um site falar com o SIGAA ou o JúpiterWeb em nome do
   aluno (CORS). No desktop, as requisições saem pelo `tauri-plugin-http`, do aparelho do aluno,
   com a credencial dele — nunca por um servidor nosso.
2. **Chaveiro do sistema**: se o aluno quiser, a credencial da universidade fica no Windows
   Credential Manager, no Keychain do macOS ou no Secret Service do Linux (comandos
   `guardar_segredo`, `ler_segredo`, `apagar_segredo`).

O banco local é o mesmo do app web (wa-sqlite + OPFS dentro do WebView); ver
`docs/adr/0002-banco-no-desktop.md`.

## Rodar

Pré-requisitos do Tauri: Rust estável e as dependências de sistema
(https://v2.tauri.app/start/prerequisites/).

```bash
pnpm --filter @akademos/desktop desktop:dev     # abre a janela apontando para o Vite
pnpm --filter @akademos/desktop desktop:build   # instaladores em src-tauri/target/release/bundle
```

No GitHub, o workflow **Desktop (Tauri)** gera os instaladores para Windows, macOS e Linux.
