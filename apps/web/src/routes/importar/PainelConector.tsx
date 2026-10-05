import type { DadosLocais } from '@akademos/core';
import { Button, Note } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import { ehDesktop } from '../../plataforma';
import s from './importar.module.css';

const ConectorDesktop = lazy(() => import('../../conectores/ConectorDesktop'));

const NOME_SISTEMA = { sigaa: 'SIGAA', jupiter: 'JúpiterWeb', outro: 'sistema acadêmico' } as const;

export function PainelConector({
  dados,
  aoConcluir,
}: {
  dados: DadosLocais;
  aoConcluir: () => void;
}) {
  const sistema = NOME_SISTEMA[dados.instituicao.sistema];
  const temConector = dados.instituicao.sistema !== 'outro';
  return (
    <section className={s.painel}>
      <div style={{ fontWeight: 600 }}>
        <Trans>
          Conector {sistema} · {dados.instituicao.sigla}
        </Trans>
      </div>
      <div className="ak-small" style={{ color: 'var(--ink-body)', lineHeight: 1.5 }}>
        <Trans>
          Mantido por voluntários da comunidade. Você entra com o seu usuário da universidade; o
          Akademos só lê histórico, oferta de turmas e pré-matrícula, e nunca guarda sua senha.
        </Trans>
      </div>
      <div className={s.etiquetas}>
        <span className={s.etiqueta}>
          <Trans>Histórico</Trans>
        </span>
        <span className={s.etiqueta}>
          <Trans>Oferta de turmas</Trans>
        </span>
        <span className={s.etiqueta}>
          <Trans>Lotação e pré-matrícula</Trans>
        </span>
        <span className={s.etiquetaNeutra}>
          <Trans>Frequência (em teste)</Trans>
        </span>
      </div>
      {!temConector ? (
        <Note tone="neutral">
          <Trans>Ainda não há conector para esta instituição. Use o PDF ou a entrada manual.</Trans>
        </Note>
      ) : ehDesktop() ? (
        <Suspense fallback={null}>
          <ConectorDesktop dados={dados} aoConcluir={aoConcluir} />
        </Suspense>
      ) : (
        <>
          <Button isDisabled style={{ alignSelf: 'flex-start' }}>
            <Trans>Entrar pelo {sistema}</Trans>
          </Button>
          <Note tone="info">
            <Trans>
              Conectores rodam no app de desktop: o navegador não deixa um site falar com o sistema
              da universidade em seu nome. Aqui na web, use o PDF do histórico.
            </Trans>
          </Note>
        </>
      )}
    </section>
  );
}
