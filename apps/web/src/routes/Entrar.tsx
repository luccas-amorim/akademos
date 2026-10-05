import { Button, PageHeader } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { gravarPreferencia } from '../dados/preferencias';

export function Entrar() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={<Trans>Entrar</Trans>} />
      <Button
        variant="link"
        onPress={() => {
          gravarPreferencia('sessao', 'local');
          void navigate({ to: '/importar' });
        }}
      >
        <Trans>Usar sem conta, só neste aparelho →</Trans>
      </Button>
    </div>
  );
}
