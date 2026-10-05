import { invoke } from '@tauri-apps/api/core';

/** Chaveiro do sistema operacional (comandos do apps/desktop/src-tauri). */
export const guardarSegredo = (chave: string, valor: string) =>
  invoke<void>('guardar_segredo', { chave, valor });

export const lerSegredo = (chave: string) => invoke<string | null>('ler_segredo', { chave });

export const apagarSegredo = (chave: string) => invoke<void>('apagar_segredo', { chave });
