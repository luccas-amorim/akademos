import { z } from 'zod';

/** Configuração do servidor, validada na partida. */
const Env = z.object({
  PORT: z.coerce.number().int().default(8787),
  DATABASE_URL: z.string().default('pglite:./.dados/pglite'),
  /** URL pública desta API (para callbacks de OAuth e links mágicos). */
  BETTER_AUTH_URL: z.string().url().default('http://localhost:8787'),
  BETTER_AUTH_SECRET: z.string().min(32).default('dev-somente-local-troque-em-producao-0123456789'),
  /** Origens do app que podem chamar a API (vírgula). */
  ORIGENS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:4173'),
  /** Domínio do relying party do passkey (ex.: luccas-amorim.github.io). */
  PASSKEY_RP_ID: z.string().default('localhost'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Envio de e-mail (link mágico) pela API do Resend; sem chave, o link vai para o log. */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_REMETENTE: z.string().default('Akademos <nao-responda@akademos.dev>'),
  /** Limite por conta, em bytes, dos blobs de sincronização. */
  COTA_SYNC: z.coerce
    .number()
    .int()
    .default(50 * 1024 * 1024),
  /** k-anonimato mínimo das estatísticas publicadas. */
  K_MINIMO: z.coerce.number().int().min(10).default(10),
  /** ε da privacidade diferencial (ruído de Laplace) nas contagens e médias. */
  EPSILON: z.coerce.number().positive().default(1),
});

export type Env = z.infer<typeof Env>;

export function lerEnv(fonte: Record<string, string | undefined> = process.env): Env {
  return Env.parse(fonte);
}
