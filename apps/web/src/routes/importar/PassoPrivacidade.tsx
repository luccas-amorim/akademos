import { Button, Switch } from '@akademos/ui';
import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { InterruptorComunidade } from '../../comunidade/InterruptorComunidade';
import { useSessao } from '../../dados/preferencias';
import s from './importar.module.css';

export function PassoPrivacidade({ aoConcluir }: { aoConcluir: () => void }) {
  const sessao = useSessao();
  return (
    <section className={s.painel}>
      <div style={{ fontWeight: 600 }}>
        <Trans>Privacidade</Trans>
      </div>
      <div className="ak-small" style={{ color: 'var(--ink-body)', lineHeight: 1.5 }}>
        <Trans>
          Por padrão, tudo fica neste aparelho. As duas opções abaixo são opcionais e você pode
          desligar quando quiser.
        </Trans>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Switch isSelected={sessao === 'conta'} isDisabled>
          <Trans>Sincronizar entre aparelhos, com criptografia de ponta a ponta</Trans>
        </Switch>
        <div className="ak-caption" style={{ paddingLeft: 42 }}>
          {sessao === 'conta' ? (
            <Trans>Ativo: sua conta sincroniza os dados cifrados.</Trans>
          ) : (
            <Trans>
              Precisa de conta.{' '}
              <Link to="/entrar" search={{ modo: 'criar' }}>
                Criar conta
              </Link>
            </Trans>
          )}
        </div>
      </div>
      <InterruptorComunidade />
      <Button style={{ alignSelf: 'flex-start' }} onPress={aoConcluir}>
        <Trans>Concluir</Trans>
      </Button>
    </section>
  );
}
