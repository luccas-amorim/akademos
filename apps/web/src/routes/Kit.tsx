import {
  Button,
  Card,
  Checkbox,
  cores,
  Filters,
  Kpi,
  LogoMark,
  nomeDaVariavel,
  Note,
  PageHeader,
  Pill,
  ProgressBar,
  Segmented,
  Switch,
  TextField,
  type Cor,
} from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';

/** Catálogo visual dos tokens e componentes de `packages/ui`. */
export function Kit() {
  const { t } = useLingui();
  const [filtro, setFiltro] = useState<'todos' | 'risco' | 'carga'>('todos');
  const [aba, setAba] = useState<'entrar' | 'criar'>('entrar');

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '40px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
      }}
    >
      <PageHeader
        eyebrow={
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <LogoMark size={20} /> packages/ui
          </span>
        }
        title={<Trans>Kit de design</Trans>}
        subtitle={
          <Trans>Tokens de docs/DESIGN.md e componentes base, construídos com React Aria.</Trans>
        }
      />

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="ak-h2">
          <Trans>Cores</Trans>
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          {(Object.keys(cores) as Cor[]).map((c) => (
            <Card key={c} padding="none" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  height: 52,
                  background: cores[c],
                  borderBottom: '1px solid var(--border)',
                }}
              />
              <div style={{ padding: '8px 10px' }}>
                <div className="ak-mono" style={{ fontSize: 11 }}>
                  {nomeDaVariavel(c)}
                </div>
                <div className="ak-mono ak-muted" style={{ fontSize: 11 }}>
                  {cores[c]}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="ak-h2">
          <Trans>Tipografia</Trans>
        </h2>
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 className="ak-h1 ak-h1--hero">Source Serif 4 · H1 34px</h1>
          <h1 className="ak-h1">Source Serif 4 · H1 30px</h1>
          <h2 className="ak-h2">Source Serif 4 · H2 21px</h2>
          <h2 className="ak-h2 ak-h2--sm">Source Serif 4 · H2 19px</h2>
          <div className="ak-kpi__value">48%</div>
          <p style={{ margin: 0, fontSize: 15 }}>
            IBM Plex Sans 400 · <span style={{ fontWeight: 500 }}>500</span> ·{' '}
            <span style={{ fontWeight: 600 }}>600</span> — texto de 14–15px.
          </p>
          <p className="ak-caption" style={{ margin: 0 }}>
            <Trans>Legenda 12–13px em --ink-2.</Trans>
          </p>
          <div className="ak-eyebrow">
            <Trans>Rótulo de seção</Trans>
          </div>
          <div className="ak-mono" style={{ fontSize: 12 }}>
            IBM Plex Mono · EX404 · 7,8 · 08–10
          </div>
        </Card>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="ak-h2">
          <Trans>Botões</Trans>
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Button variant="primary">
            <Trans>Primário</Trans>
          </Button>
          <Button variant="dark">
            <Trans>Chave de acesso</Trans>
          </Button>
          <Button variant="olive">
            <Trans>Patrocinar</Trans>
          </Button>
          <Button variant="outline">Google</Button>
          <Button variant="outline-primary" size="sm">
            <Trans>Adicionar</Trans>
          </Button>
          <Button variant="primary" size="sm">
            <Trans>Na grade ✓</Trans>
          </Button>
          <Button variant="subtle">
            <Trans>Revisar 2</Trans>
          </Button>
          <Button variant="link">
            <Trans>Todos os insights</Trans>
          </Button>
          <Button variant="primary" isDisabled>
            <Trans>Desativado</Trans>
          </Button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="ak-h2">
          <Trans>Indicadores</Trans>
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <Kpi label={t`Integralizado`} value="48%" progress={48} caption={t`62 de 128 créditos`} />
          <Kpi label={t`Conflitos`} value="0" compact valueColor="var(--olive-ink)" />
        </div>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ProgressBar value={72} label={t`Computação`} size="md" color="var(--olive)" />
          <ProgressBar value={40} label={t`Lotação`} size="md" color="var(--danger)" />
          <ProgressBar value={60} label={t`Média`} size="lg" color="var(--amber-ink)" />
        </Card>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill strong color="var(--olive-ink)" background="var(--olive-tint)">
            Cursada
          </Pill>
          <Pill strong color="var(--primary)" background="var(--primary-tint)">
            Cursando
          </Pill>
          <Pill strong color="var(--amber-ink)" background="var(--amber-tint)">
            Adiada
          </Pill>
          <Pill outline>4 cr · 60 h</Pill>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="ak-h2">
          <Trans>Controles</Trans>
        </h2>
        <Filters
          label={t`Tipo`}
          value={filtro}
          onChange={setFiltro}
          options={[
            { id: 'todos', label: t`Todos` },
            { id: 'risco', label: t`Risco` },
            { id: 'carga', label: t`Carga` },
          ]}
        />
        <div style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Segmented
            label={t`Modo`}
            value={aba}
            onChange={setAba}
            options={[
              { id: 'entrar', label: t`Entrar` },
              { id: 'criar', label: t`Criar conta` },
            ]}
          />
          <TextField label={t`E-mail`} type="email" placeholder="voce@exemplo.com" />
          <TextField
            label={t`Diário`}
            multiline
            placeholder={t`O que você espera do próximo semestre?`}
          />
          <Checkbox defaultSelected>
            <Trans>Cursada</Trans>
          </Checkbox>
          <Switch>
            <Trans>Compartilhar históricos anônimos</Trans>
          </Switch>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520 }}>
          <Note tone="danger">
            <Trans>1 faixa com choque de horário. Troque de turma ao lado.</Trans>
          </Note>
          <Note tone="positive">
            <Trans>Dias livres: Sex. Menor chance de vaga no plano: 83%.</Trans>
          </Note>
          <Note tone="warning">
            <Trans>2 linhas para revisar.</Trans>
          </Note>
        </div>
      </section>
    </div>
  );
}
