import { LogoMark } from '@akademos/ui';
import type { ReactNode } from 'react';

/** Tela cheia para carregamento e erros antes de os dados abrirem. */
export function TelaDeEstado({ titulo, texto }: { titulo: string; texto?: ReactNode }) {
  return (
    <div
      role="status"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        <LogoMark size={36} />
        <h1 className="ak-h2">{titulo}</h1>
        {texto && (
          <p className="ak-muted" style={{ margin: 0 }}>
            {texto}
          </p>
        )}
      </div>
    </div>
  );
}
