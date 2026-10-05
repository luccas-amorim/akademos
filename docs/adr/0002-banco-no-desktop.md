# ADR 0002 — Banco local no desktop

- Status: aceita
- Data: 2026-10-05
- Contexto do roadmap: tarefa 4.1

## Contexto

A arquitetura previa `tauri-plugin-sql` como adaptador do SQLite no desktop. O
`packages/db` executa transações como `BEGIN` … instruções … `COMMIT` sobre uma conexão,
serializadas por uma fila (`Mutex`). O `tauri-plugin-sql` expõe um *pool* de conexões
(sqlx): instruções consecutivas podem cair em conexões diferentes, e um `BEGIN` numa conexão
não protege a escrita feita em outra.

## Decisão

No desktop, o app usa o **mesmo adaptador do navegador** (wa-sqlite num Web Worker, com
OPFS), que roda dentro do WebView (WebView2 no Windows, WebKit no macOS/Linux). O Tauri entra
só onde o navegador não alcança: HTTP sem CORS para conectores e chaveiro do sistema.

## Consequências

- Um caminho de código a menos para testar; o comportamento offline é idêntico ao da web.
- O arquivo do banco fica no armazenamento do WebView do app (isolado de outros sites), não
  num `.db` visível no disco. A exportação JSON/CSV continua disponível em *Seus dados*.
- Se o WebView não oferecer OPFS com acesso síncrono, o adaptador cai para IndexedDB, como
  na web.
- Revisitar se o `tauri-plugin-sql` passar a permitir conexão única ou transações explícitas.
