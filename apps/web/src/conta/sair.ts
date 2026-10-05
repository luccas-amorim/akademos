import { gravarChaveLocal } from './chave';
import { auth } from './cliente';
import { servicoSync } from './sincronizacao';
import { gravarToken } from './token';

/** Encerra a sessão: apaga token e chave deste aparelho; os dados locais ficam. */
export async function sairDaConta(): Promise<void> {
  await auth.signOut().catch(() => undefined);
  gravarToken(null);
  gravarChaveLocal(null);
  await servicoSync.sincronizarAgora(); // passa a "desligada"
}
