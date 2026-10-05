import { Button } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Avisa quando há versão nova em cache; o aluno decide quando recarregar. */
export function AvisoAtualizacao() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker,
  } = useRegisterSW();

  if (!precisaAtualizar && !prontoOffline) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 50,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        maxWidth: 'calc(100vw - 32px)',
        fontSize: 13.5,
      }}
    >
      <span>
        {precisaAtualizar ? (
          <Trans>Há uma versão nova do Akademos.</Trans>
        ) : (
          <Trans>Pronto para funcionar offline.</Trans>
        )}
      </span>
      {precisaAtualizar && (
        <Button size="sm" onPress={() => void updateServiceWorker(true)}>
          <Trans>Atualizar</Trans>
        </Button>
      )}
      <Button
        size="sm"
        variant="subtle"
        onPress={() => {
          setPrecisaAtualizar(false);
          setProntoOffline(false);
        }}
      >
        <Trans>Fechar</Trans>
      </Button>
    </div>
  );
}
