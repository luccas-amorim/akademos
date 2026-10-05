# @akademos/server

API opcional do Akademos. O app funciona sem ela ("Usar sem conta"); com ela, o aluno
sincroniza entre aparelhos e pode contribuir com agregados anônimos.

## O que guarda

| Tabela | Conteúdo |
|---|---|
| `user`, `session`, `account`, `verification`, `passkey` | Conta (Better Auth). Nenhuma nota. |
| `chave_sync` | Sal do Argon2id e um verificador cifrado. Não permitem decifrar nada. |
| `blob_sync` | Lotes de operações cifrados com XChaCha20-Poly1305 no aparelho. Opacos para o servidor. |
| `contribuicao` | Notas por disciplina (0–10, arredondadas a 0,5), sem conta, sem nome, sem semestre. |

## Rotas

- `GET /saude`
- `/api/auth/*` — Better Auth: passkey, Google, link mágico, e-mail e senha. Token Bearer
  no cabeçalho `set-auth-token`.
- `GET/PUT /sync/chave`, `POST /sync/push`, `GET /sync/pull?desde=&dispositivo=`, `DELETE /sync`
- `DELETE /conta` — apaga a conta e tudo o que depende dela (LGPD).
- `POST /stats/contribuicao`, `DELETE /stats/contribuicao/:id` (cabeçalho `x-segredo`),
  `GET /stats/:sigla/:curso/:ano`
- `GET /registry`, `GET /registry/matriz/:sigla/:curso/:ano`

## Privacidade dos agregados

- k-anonimato: célula com menos de `K_MINIMO` (padrão 10, mínimo 10) contribuições não sai.
- Privacidade diferencial: ruído de Laplace com ε = `EPSILON` (padrão **1**) por estatística
  publicada (média: sensibilidade 10/n; taxas: 1/n; r de Pearson: 2/n). Contagens publicadas
  arredondadas para baixo à dezena. O resultado fica em cache por 10 minutos para que pedidos
  repetidos não reamostrem o ruído.

## Rodar

```bash
pnpm dev:server                    # PGlite em apps/server/.dados, porta 8787
docker compose up --build          # Postgres + API (precisa de .env com BETTER_AUTH_SECRET)
```
