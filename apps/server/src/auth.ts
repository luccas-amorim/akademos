import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, magicLink, oauthPopup } from 'better-auth/plugins';
import type { BancoServidor } from './db';
import * as schema from './db/schema';
import type { Env } from './env';

/** Envio de e-mail: Resend quando configurado; senão, o link vai para o log (dev). */
async function enviarEmail(env: Env, para: string, assunto: string, texto: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.info(`[e-mail para ${para}] ${assunto}\n${texto}`);
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_REMETENTE, to: para, subject: assunto, text: texto }),
  });
  if (!r.ok) throw new Error(`Falha ao enviar e-mail (${r.status})`);
}

/**
 * O link do e-mail abre o app (não a API): o app confirma o token e recebe
 * a sessão como Bearer. Só para origens confiáveis; senão, o link padrão.
 */
export function linkParaOApp(url: string, token: string, origens: string[]): string {
  const destino = new URL(url).searchParams.get('callbackURL');
  if (!destino) return url;
  try {
    const app = new URL(destino);
    if (!origens.includes(app.origin)) return url;
    app.searchParams.set('link', token);
    return app.toString();
  } catch {
    return url;
  }
}

/**
 * Autenticação (docs/ARCHITECTURE.md › Autenticação): passkey por padrão,
 * Google, link mágico por e-mail e senha como alternativa. O token de sessão
 * viaja como Bearer, porque o app (GitHub Pages) e a API ficam em domínios
 * diferentes.
 */
export function criarAuth(db: BancoServidor, env: Env) {
  const origens = env.ORIGENS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return betterAuth({
    appName: 'Akademos',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: origens,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        passkey: schema.passkey,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 10, autoSignIn: true },
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {},
    plugins: [
      passkey({ rpID: env.PASSKEY_RP_ID, rpName: 'Akademos', origin: origens }),
      magicLink({
        sendMagicLink: ({ email, url, token }) =>
          enviarEmail(
            env,
            email,
            'Seu link de acesso ao Akademos',
            `Use este link para entrar (vale por 5 minutos):\n\n${linkParaOApp(url, token, origens)}\n\nSe não foi você, ignore este e-mail.`,
          ),
      }),
      // Google e outros provedores por popup: o token volta para a janela do app.
      oauthPopup(),
      bearer(),
    ],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
