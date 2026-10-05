/**
 * Esquema Postgres do servidor. O servidor nunca guarda nota, histórico ou
 * credencial em claro: só contas (Better Auth), blobs cifrados de
 * sincronização e contribuições anônimas para agregados.
 */
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const criadoEm = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

/* ——— Better Auth ——— */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: criadoEm(),
  updatedAt: atualizadoEm(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: criadoEm(),
  updatedAt: atualizadoEm(),
});

export const passkey = pgTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    aaguid: text('aaguid'),
  },
  (t) => [
    index('passkey_user_idx').on(t.userId),
    index('passkey_credential_idx').on(t.credentialID),
  ],
);

/* ——— Sincronização (relay cego) ——— */

/** Parâmetros públicos da chave de cada conta: sal do Argon2id e verificador cifrado. */
export const chaveSync = pgTable('chave_sync', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** Sal do Argon2id (base64). Não é segredo. */
  sal: text('sal').notNull(),
  /** Constante cifrada com a chave; confirma a frase de recuperação no aparelho. */
  verificador: text('verificador').notNull(),
  createdAt: criadoEm(),
});

/** Lotes de ops cifrados. O `id` serial é o cursor de leitura. */
export const blobSync = pgTable(
  'blob_sync',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Aparelho que enviou (id aleatório local), para não reler o próprio envio. */
    dispositivo: text('dispositivo').notNull(),
    /** XChaCha20-Poly1305: nonce ‖ texto cifrado, em base64. */
    conteudo: text('conteudo').notNull(),
    tamanho: integer('tamanho').notNull(),
    createdAt: criadoEm(),
  },
  (t) => [index('blob_sync_user_cursor_idx').on(t.userId, t.id)],
);

/* ——— Comunidade (opt-in, anônimo) ——— */

/**
 * Uma contribuição por aparelho e matriz, sem vínculo com conta. `segredoHash`
 * permite ao próprio aparelho substituir ou apagar a contribuição.
 */
export const contribuicao = pgTable(
  'contribuicao',
  {
    id: text('id').primaryKey(),
    segredoHash: text('segredo_hash').notNull(),
    matrizId: text('matriz_id').notNull(),
    /** { codigoDisciplina: nota normalizada 0–10, arredondada a 0,5 } */
    notas: jsonb('notas').$type<Record<string, number>>().notNull(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index('contribuicao_matriz_idx').on(t.matrizId)],
);
