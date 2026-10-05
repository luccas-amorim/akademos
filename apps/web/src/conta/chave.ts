import {
  conferirVerificador,
  criarVerificador,
  deBase64,
  derivarChave,
  gerarSal,
  paraBase64,
} from '@akademos/sync';

/**
 * Chave mestra derivada da frase de recuperação. Fica só neste aparelho.
 * (No desktop, o keychain do sistema; na web, o armazenamento da origem.)
 */
const CHAVE = 'akademos:chave-sync';

export function lerChaveLocal(): Uint8Array | null {
  try {
    const v = localStorage.getItem(CHAVE);
    if (!v) return null;
    return Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export function gravarChaveLocal(chave: Uint8Array | null): void {
  try {
    if (!chave) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, btoa(String.fromCharCode(...chave)));
  } catch {
    // ignore
  }
}

/** Primeira vez: deriva a chave, cria sal e verificador para guardar no servidor. */
export async function prepararChaveNova(frase: string) {
  const sal = await gerarSal();
  const chave = await derivarChave(frase, sal);
  return {
    chave,
    sal: await paraBase64(sal),
    verificador: await paraBase64(await criarVerificador(chave)),
  };
}

/** Outro aparelho: deriva com o sal da conta e confere com o verificador. */
export async function recuperarChave(
  frase: string,
  sal: string,
  verificador: string,
): Promise<Uint8Array | null> {
  const chave = await derivarChave(frase, await deBase64(sal));
  return (await conferirVerificador(chave, await deBase64(verificador))) ? chave : null;
}
