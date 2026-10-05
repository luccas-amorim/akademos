import {
  ClienteRelay,
  deBase64,
  paraBase64,
  sincronizar,
  type ResultadoSync,
} from '@akademos/sync';
import * as Seguro from 'expo-secure-store';
import { store } from './dados/store';
import { avisarNotasNovas } from './notificacoes';

/** URL da API (EXPO_PUBLIC_API_URL no build). Sem ela, o app é só local. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || null;

const TOKEN = 'akademos.token';
const CHAVE = 'akademos.chave-sync';

/** Token e chave ficam no Keychain/Keystore do sistema, não no SQLite. */
export async function guardarCredenciaisDeSync(token: string, chave: Uint8Array): Promise<void> {
  await Seguro.setItemAsync(TOKEN, token);
  await Seguro.setItemAsync(CHAVE, await paraBase64(chave));
}

export async function esquecerCredenciaisDeSync(): Promise<void> {
  await Seguro.deleteItemAsync(TOKEN);
  await Seguro.deleteItemAsync(CHAVE);
}

export async function temContaNesteAparelho(): Promise<boolean> {
  return !!API_URL && !!(await Seguro.getItemAsync(TOKEN));
}

/** Uma rodada de sincronização; avisa das notas que chegaram. */
export async function sincronizarAgora(): Promise<ResultadoSync | null> {
  const token = await Seguro.getItemAsync(TOKEN);
  const chave64 = await Seguro.getItemAsync(CHAVE);
  if (!API_URL || !token || !chave64 || !store.relogio) return null;
  const antes = store.getSnapshot();
  const cursadasAntes = antes.fase === 'pronto' && antes.dados ? antes.dados.cursadas : [];
  const relay = new ClienteRelay({ url: API_URL, token: () => token });
  const r = await sincronizar(store.banco.ops, relay, await deBase64(chave64), store.relogio.no);
  if (r.recebidas) {
    await store.recarregar();
    const depois = store.getSnapshot();
    if (depois.fase === 'pronto' && depois.dados) {
      await avisarNotasNovas(cursadasAntes, depois.dados.cursadas, depois.dados.matriz.disciplinas);
    }
  }
  return r;
}
