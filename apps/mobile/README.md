# @akademos/mobile

App móvel (Expo) que reaproveita `@akademos/core` (painel, planejador, insights),
`@akademos/db` (com o adaptador expo-sqlite em `src/dados/driverExpo.ts`) e `@akademos/sync`.

- Telas: Início, Percurso, Planejar e Insights.
- Sincronização: entre com a conta criada na web/desktop e a frase de recuperação; token e
  chave ficam no Keychain/Keystore (expo-secure-store).
- Notificações locais (sem servidor de push): lembrete do fim da matrícula (véspera e dia) e
  aviso de nota lançada depois de sincronizar.
- A cifra usa `react-native-libsodium` no lugar da libsodium em WebAssembly (o Hermes não roda
  WASM): o Metro troca o módulo em `metro.config.js`. Por isso o app precisa de build nativo
  (development build), não roda no Expo Go.

```bash
pnpm --filter @akademos/mobile catalogo     # regenera o catálogo a partir do registro
pnpm --filter @akademos/mobile android      # build nativo + emulador/aparelho
EXPO_PUBLIC_API_URL=https://api.exemplo pnpm --filter @akademos/mobile start
```
