/**
 * Cifra de ponta a ponta (docs/ARCHITECTURE.md › Sincronização).
 *
 * - Frase de recuperação: 12 palavras BIP39 (lista em português), gerada no
 *   aparelho e mostrada uma vez.
 * - Chave mestra: Argon2id(frase, sal) com 32 bytes. O sal é público e fica no
 *   servidor; a frase e a chave nunca saem do aparelho.
 * - Lotes: XChaCha20-Poly1305 com nonce aleatório de 192 bits e dado associado
 *   que fixa a versão do formato.
 */
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/portuguese.js';
import sodium from 'libsodium-wrappers-sumo';

const DADO_ASSOCIADO = 'akademos/sync/v1';
const VERIFICADOR = 'akademos: a frase confere';

let pronto: Promise<void> | null = null;
async function libsodium(): Promise<typeof sodium> {
  pronto ??= sodium.ready;
  await pronto;
  return sodium;
}

/** Normaliza o que o aluno digita: minúsculas, espaços simples, sem acentos trocados. */
export function normalizarFrase(frase: string): string {
  return frase.normalize('NFKD').toLowerCase().trim().split(/\s+/).join(' ').normalize('NFKD');
}

export function gerarFrase(): string {
  return generateMnemonic(wordlist, 128); // 12 palavras
}

export function fraseValida(frase: string): boolean {
  return validateMnemonic(normalizarFrase(frase), wordlist);
}

export async function gerarSal(): Promise<Uint8Array> {
  const s = await libsodium();
  return s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
}

export interface ParametrosDerivacao {
  opslimit: number;
  memlimit: number;
}

/** Argon2id "interativo" (64 MiB): roda em celular e navegador em ~1 s. */
export async function parametrosPadrao(): Promise<ParametrosDerivacao> {
  const s = await libsodium();
  return {
    opslimit: s.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    memlimit: s.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  };
}

export async function derivarChave(
  frase: string,
  sal: Uint8Array,
  parametros?: ParametrosDerivacao,
): Promise<Uint8Array> {
  if (!fraseValida(frase)) throw new Error('Frase de recuperação inválida');
  const s = await libsodium();
  const p = parametros ?? (await parametrosPadrao());
  return s.crypto_pwhash(
    s.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    normalizarFrase(frase),
    sal,
    p.opslimit,
    p.memlimit,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
}

/** nonce ‖ texto cifrado. */
export async function cifrar(chave: Uint8Array, dados: Uint8Array): Promise<Uint8Array> {
  const s = await libsodium();
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const cifrado = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    dados,
    DADO_ASSOCIADO,
    null,
    nonce,
    chave,
  );
  const saida = new Uint8Array(nonce.length + cifrado.length);
  saida.set(nonce);
  saida.set(cifrado, nonce.length);
  return saida;
}

/** Lança se a chave estiver errada ou o conteúdo tiver sido adulterado. */
export async function decifrar(chave: Uint8Array, pacote: Uint8Array): Promise<Uint8Array> {
  const s = await libsodium();
  const n = s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  if (pacote.length <= n) throw new Error('Pacote cifrado curto demais');
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    pacote.subarray(n),
    DADO_ASSOCIADO,
    pacote.subarray(0, n),
    chave,
  );
}

export async function criarVerificador(chave: Uint8Array): Promise<Uint8Array> {
  return cifrar(chave, new TextEncoder().encode(VERIFICADOR));
}

export async function conferirVerificador(
  chave: Uint8Array,
  verificador: Uint8Array,
): Promise<boolean> {
  try {
    return new TextDecoder().decode(await decifrar(chave, verificador)) === VERIFICADOR;
  } catch {
    return false;
  }
}

export async function paraBase64(b: Uint8Array): Promise<string> {
  const s = await libsodium();
  return s.to_base64(b, s.base64_variants.ORIGINAL);
}

export async function deBase64(t: string): Promise<Uint8Array> {
  const s = await libsodium();
  return s.from_base64(t, s.base64_variants.ORIGINAL);
}
