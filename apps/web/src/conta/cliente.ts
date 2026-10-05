import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/react';
import { magicLinkClient, oauthPopupClient } from 'better-auth/client/plugins';
import { API_URL } from './config';
import { gravarToken, lerToken } from './token';

/**
 * Cliente do Better Auth. App e API ficam em domínios diferentes, então a
 * sessão viaja como Bearer: o servidor devolve o token no cabeçalho
 * set-auth-token e nós o mandamos em Authorization.
 */
export const auth = createAuthClient({
  baseURL: `${API_URL ?? 'http://localhost:8787'}/api/auth`,
  plugins: [passkeyClient(), magicLinkClient(), oauthPopupClient()],
  fetchOptions: {
    auth: { type: 'Bearer', token: () => lerToken() ?? '' },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get('set-auth-token');
      if (token) gravarToken(token);
    },
  },
});
