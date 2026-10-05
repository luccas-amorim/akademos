import { Button } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { TelaDeEstado } from './TelaDeEstado';

/** Erro inesperado numa tela: explica e oferece recarregar, sem perder dados. */
export function ErroDeTela({ error, reset }: ErrorComponentProps) {
  console.error(error);
  return (
    <TelaDeEstado
      titulo="Algo deu errado nesta tela"
      texto={
        <>
          <Trans>Seus dados continuam salvos neste aparelho.</Trans>{' '}
          <Button variant="link" onPress={reset}>
            <Trans>Tentar de novo</Trans>
          </Button>
        </>
      }
    />
  );
}
