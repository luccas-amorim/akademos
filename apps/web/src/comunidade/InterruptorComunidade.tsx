import { Switch } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { temServidor } from '../conta/config';
import { useConsentimentoComunidade } from '../dados/preferencias';
import { useEstadoDados } from '../dados/store';
import { enviarContribuicao, previaDaContribuicao, retirarContribuicao } from './comunidade';

/** Consentimento explícito, com a prévia exata do que seria enviado. */
export function InterruptorComunidade() {
  const [ativo, setAtivo] = useConsentimentoComunidade();
  const estado = useEstadoDados();
  const dados = estado.fase === 'pronto' ? estado.dados : null;
  const previa = dados ? previaDaContribuicao(dados) : null;

  const alterar = (v: boolean) => {
    setAtivo(v);
    if (v && dados) void enviarContribuicao(dados).catch(() => false);
    if (!v) void retirarContribuicao().catch(() => undefined);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Switch isSelected={ativo} onChange={alterar}>
        <Trans>Compartilhar meu histórico anonimamente com a comunidade</Trans>
      </Switch>
      <div className="ak-caption" style={{ paddingLeft: 42 }}>
        <Trans>
          Envia só notas por disciplina desta matriz (0–10, arredondadas a 0,5), sem nome,
          matrícula, conta ou semestre. Os agregados só são publicados com pelo menos 10 históricos
          por célula. Desligar apaga a contribuição.
        </Trans>
        {!temServidor() && (
          <>
            {' '}
            <Trans>Esta publicação não tem servidor: nada será enviado.</Trans>
          </>
        )}
      </div>
      {previa && (
        <details style={{ paddingLeft: 42 }} className="ak-caption">
          <summary style={{ cursor: 'pointer' }}>
            <Trans>Ver exatamente o que seria enviado</Trans>
          </summary>
          <pre
            className="ak-mono"
            style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '6px 0 0' }}
          >
            {JSON.stringify(previa, null, 1)}
          </pre>
        </details>
      )}
    </div>
  );
}
