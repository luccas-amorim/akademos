import { serve } from '@hono/node-server';
import { criarApp } from './app';
import { criarAuth } from './auth';
import { abrirBancoServidor } from './db';
import { lerEnv } from './env';

const env = lerEnv();
const { db, fechar } = await abrirBancoServidor(env.DATABASE_URL);
const app = criarApp({ db, auth: criarAuth(db, env), env });

const servidor = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.info(`Akademos API em http://localhost:${info.port}`);
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    servidor.close();
    void fechar().finally(() => process.exit(0));
  });
}
