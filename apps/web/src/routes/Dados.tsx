import { Button, Card, Confirmacao, Note, PageHeader } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { baixar, historicoEmCsv, montarExportacao } from '../dados/exportar';
import { gravarPreferencia } from '../dados/preferencias';
import { store, useDados, useEstadoDados } from '../dados/store';
import { CartaoConta } from './dados/CartaoConta';
import { InterruptorComunidade } from '../comunidade/InterruptorComunidade';

const DESCRICAO_ARMAZENAMENTO = {
  opfs: 'OPFS (sistema de arquivos privado do navegador)',
  indexeddb: 'IndexedDB do navegador',
  memoria: 'memória (nada é guardado ao fechar a aba)',
} as const;

/** LGPD: portabilidade (exportar tudo) e eliminação (apagar deste aparelho). */
export function Dados() {
  const { t } = useLingui();
  const dados = useDados();
  const estado = useEstadoDados();
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const dia = new Date().toISOString().slice(0, 10);

  const exportarJson = async () => {
    const tabelas = await store.banco.exportar();
    const conteudo = JSON.stringify(montarExportacao(dados, tabelas), null, 2);
    baixar(`akademos-${dia}.json`, conteudo, 'application/json');
  };

  const apagar = async () => {
    setApagando(true);
    await store.destruir();
    gravarPreferencia('sessao', null);
    gravarPreferencia('comunidade', null);
    setConfirmando(false);
    void navigate({ to: '/entrar' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <PageHeader
        title={<Trans>Seus dados</Trans>}
        subtitle={
          <Trans>
            Tudo o que o Akademos sabe sobre você está neste aparelho. Leve com você ou apague
            quando quiser.
          </Trans>
        }
      />
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="ak-h2 ak-h2--sm">
          <Trans>Onde estão</Trans>
        </h2>
        <div className="ak-small" style={{ color: 'var(--ink-body)' }}>
          {estado.fase === 'pronto' && (
            <Trans>
              Banco SQLite local em {DESCRICAO_ARMAZENAMENTO[estado.armazenamento]}.{' '}
              {dados.cursadas.length} cursadas, {dados.ofertas.length} turmas, {dados.planos.length}{' '}
              planos.
            </Trans>
          )}
        </div>
      </Card>
      <CartaoConta />
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="ak-h2 ak-h2--sm">
          <Trans>Comunidade</Trans>
        </h2>
        <InterruptorComunidade />
      </Card>
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="ak-h2 ak-h2--sm">
          <Trans>Exportar</Trans>
        </h2>
        <div className="ak-small" style={{ color: 'var(--ink-body)' }}>
          <Trans>
            JSON com todas as tabelas (para levar a outro aparelho ou guardar) e CSV do histórico
            (para planilhas).
          </Trans>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onPress={() => void exportarJson()}>
            <Trans>Baixar tudo (JSON)</Trans>
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              baixar(
                `akademos-historico-${dia}.csv`,
                historicoEmCsv(dados),
                'text/csv;charset=utf-8',
              )
            }
          >
            <Trans>Histórico (CSV)</Trans>
          </Button>
        </div>
      </Card>
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="ak-h2 ak-h2--sm">
          <Trans>Apagar dados deste aparelho</Trans>
        </h2>
        <Note tone="danger">
          <Trans>
            Remove o banco local deste navegador. Se você não tem conta com sincronização, não há
            outra cópia: exporte antes.
          </Trans>
        </Note>
        <Button
          variant="outline"
          style={{ alignSelf: 'flex-start', color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onPress={() => setConfirmando(true)}
        >
          <Trans>Apagar dados deste aparelho</Trans>
        </Button>
      </Card>
      <Confirmacao
        aberta={confirmando}
        titulo={t`Apagar todos os dados deste aparelho?`}
        rotuloConfirmar={apagando ? t`Apagando…` : t`Apagar`}
        rotuloCancelar={t`Cancelar`}
        perigosa
        aoConfirmar={() => void apagar()}
        aoFechar={() => setConfirmando(false)}
      >
        <Trans>
          Histórico, planos, objetivos e diário serão removidos deste navegador. Esta ação não pode
          ser desfeita.
        </Trans>
      </Confirmacao>
    </div>
  );
}
