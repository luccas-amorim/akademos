import { detectarNotasNovas, formatarNota, type Cursada, type Disciplina } from '@akademos/core';
import * as Notificacoes from 'expo-notifications';

export { lerDataDoPrazo } from './datas';

/**
 * Notificações locais (fase 5.3): nada passa por servidor de push. O próprio
 * aparelho agenda o lembrete do prazo de matrícula e avisa quando uma nota
 * aparece depois de sincronizar.
 */
export async function configurarNotificacoes(): Promise<void> {
  Notificacoes.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function permitido(): Promise<boolean> {
  const atual = await Notificacoes.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  return (await Notificacoes.requestPermissionsAsync()).granted;
}

/** Lembra do prazo de matrícula na véspera e no dia. Devolve os ids agendados. */
export async function agendarPrazoDeMatricula(prazo: Date, semestre: string): Promise<string[]> {
  if (!(await permitido())) return [];
  const vespera = new Date(prazo.getTime() - 24 * 3600_000);
  const ids: string[] = [];
  for (const [quando, titulo] of [
    [vespera, `Amanhã termina a matrícula de ${semestre}`],
    [prazo, `Hoje termina a matrícula de ${semestre}`],
  ] as const) {
    if (quando <= new Date()) continue;
    ids.push(
      await Notificacoes.scheduleNotificationAsync({
        content: { title: titulo, body: 'Confira o seu plano e as turmas com risco de lotar.' },
        trigger: { type: Notificacoes.SchedulableTriggerInputTypes.DATE, date: quando },
      }),
    );
  }
  return ids;
}

/** Depois de sincronizar: avisa das notas que chegaram. */
export async function avisarNotasNovas(
  antes: readonly Cursada[],
  depois: readonly Cursada[],
  disciplinas: readonly Disciplina[],
): Promise<number> {
  const novas = detectarNotasNovas(antes, depois);
  if (!novas.length || !(await permitido())) return 0;
  for (const n of novas) {
    const nome =
      disciplinas.find((d) => d.codigo === n.disciplinaCodigo)?.nome ?? n.disciplinaCodigo;
    await Notificacoes.scheduleNotificationAsync({
      content: { title: `Nota lançada em ${nome}`, body: `Sua nota: ${formatarNota(n.nota)}` },
      trigger: null,
    });
  }
  return novas.length;
}
