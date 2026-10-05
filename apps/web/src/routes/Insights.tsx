import type { TipoInsight } from '@akademos/core';
import { Filters, PageHeader } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { CartaoInsight } from '../componentes/CartaoInsight';
import { useAnalise } from '../dados/analise';

type Filtro = 'todos' | TipoInsight;

export function Insights() {
  const { t } = useLingui();
  const { insights, comunidade } = useAnalise();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const visiveis = insights.filter((i) => filtro === 'todos' || i.tipo === filtro);
  const opcoes: Array<{ id: Filtro; label: string }> = [
    { id: 'todos', label: t`Todos` },
    { id: 'risco', label: t`Risco` },
    { id: 'lotacao', label: t`Lotação` },
    { id: 'correlacao', label: t`Correlação` },
    { id: 'carga', label: t`Carga` },
    { id: 'carreira', label: t`Carreira` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820 }}>
      <PageHeader
        title={<Trans>Insights</Trans>}
        subtitle={
          <>
            <Trans>
              Calculados no seu aparelho. Comparações com a comunidade usam só históricos anônimos
              de quem optou por compartilhar.
            </Trans>
            {comunidade?.demonstracao && (
              <>
                {' '}
                <Trans>Nesta matriz fictícia, os dados da comunidade são de demonstração.</Trans>
              </>
            )}
          </>
        }
      />
      <Filters label={t`Tipo de insight`} options={opcoes} value={filtro} onChange={setFiltro} />
      <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visiveis.map((i) => (
          <CartaoInsight key={i.id} insight={i} largo />
        ))}
        {!visiveis.length && (
          <p className="ak-muted" style={{ margin: 0 }}>
            <Trans>Nenhum insight deste tipo agora.</Trans>
          </p>
        )}
      </div>
    </div>
  );
}
