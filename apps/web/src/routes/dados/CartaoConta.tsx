import { tempoDecorrido } from '@akademos/core';
import { ClienteRelay } from '@akademos/sync';
import { Button, Card, Confirmacao, Note } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { API_URL, temServidor } from '../../conta/config';
import { sairDaConta } from '../../conta/sair';
import { servicoSync, useEstadoSync } from '../../conta/sincronizacao';
import { lerToken } from '../../conta/token';
import { gravarPreferencia, useSessao } from '../../dados/preferencias';

/** Conta e sincronização: estado, sincronizar agora e apagar a conta (LGPD). */
export function CartaoConta() {
  const { t } = useLingui();
  const sessao = useSessao();
  const sync = useEstadoSync();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!temServidor()) return null;
  if (sessao !== 'conta') {
    return (
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="ak-h2 ak-h2--sm">
          <Trans>Sincronizar entre aparelhos</Trans>
        </h2>
        <div className="ak-small" style={{ color: 'var(--ink-body)' }}>
          <Trans>
            Crie uma conta para levar seus dados a outros aparelhos. Tudo é cifrado aqui antes de
            sair; o servidor guarda só blobs ilegíveis.
          </Trans>
        </div>
        <Link to="/entrar" search={{ modo: 'criar' }}>
          <Trans>Criar conta →</Trans>
        </Link>
      </Card>
    );
  }

  const apagarConta = async () => {
    setErro(null);
    try {
      await new ClienteRelay({ url: API_URL!, token: lerToken }).apagarConta();
      await sairDaConta();
      // Os dados locais continuam: o aparelho volta ao modo sem conta.
      gravarPreferencia('sessao', 'local');
      setConfirmando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  const ultima =
    'ultima' in sync && sync.ultima ? tempoDecorrido(new Date(sync.ultima), new Date()) : null;
  return (
    <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 className="ak-h2 ak-h2--sm">
        <Trans>Conta e sincronização</Trans>
      </h2>
      <div className="ak-small" style={{ color: 'var(--ink-body)' }}>
        {sync.fase === 'sincronizando' ? (
          <Trans>Sincronizando…</Trans>
        ) : ultima ? (
          <Trans>Última sincronização {ultima}.</Trans>
        ) : (
          <Trans>Ainda não sincronizou.</Trans>
        )}
        {sync.fase === 'erro' && <> {sync.mensagem}</>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="outline" onPress={() => void servicoSync.sincronizarAgora()}>
          <Trans>Sincronizar agora</Trans>
        </Button>
        <Button
          variant="outline"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onPress={() => setConfirmando(true)}
        >
          <Trans>Apagar conta e dados do servidor</Trans>
        </Button>
      </div>
      {erro && <Note tone="danger">{erro}</Note>}
      <Confirmacao
        aberta={confirmando}
        titulo={t`Apagar a conta?`}
        rotuloConfirmar={t`Apagar conta`}
        rotuloCancelar={t`Cancelar`}
        perigosa
        aoConfirmar={() => void apagarConta()}
        aoFechar={() => setConfirmando(false)}
      >
        <Trans>
          A conta, as chaves e todos os blobs cifrados são apagados do servidor. Os dados deste
          aparelho continuam aqui, sem sincronizar.
        </Trans>
      </Confirmacao>
    </Card>
  );
}
