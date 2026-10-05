import { Button, PageHeader } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { carregarExemplo } from '../dados/acoes';

export function Importar() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={<Trans>Traga seu histórico</Trans>} />
      <Button
        onPress={async () => {
          await carregarExemplo();
          void navigate({ to: '/' });
        }}
      >
        <Trans>Explorar com dados de exemplo</Trans>
      </Button>
    </div>
  );
}
