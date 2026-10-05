import { PageHeader } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PageHeader
        title={<Trans>Página não encontrada</Trans>}
        subtitle={<Trans>O endereço não corresponde a nenhuma tela do Akademos.</Trans>}
      />
      <Link to="/">
        <Trans>Voltar ao início</Trans>
      </Link>
    </div>
  );
}
