import React from 'react';
import Link from '@docusaurus/Link';
import {
  type Disciplina,
  TETO_FAIXAS,
  cargaDaRota,
  chDe,
  concluida,
  config,
  corDaArea,
  diasLivres,
  disciplinas,
  folgaDaSemana,
  meta,
  ordinalDe,
  resumoDaRota,
  rotaPadrao,
  rotas,
} from '@site/src/lib/grade';

/**
 * Painel de progresso derivado de src/data/curriculo.json. Não há número
 * digitado à mão neste arquivo: tudo sai da matriz e de config.
 */

// O painel mostra a rota padrão. A comparação entre rotas vive no
// Planejamento de Integralização.
const ROTA = rotaPadrao.id;

const CH_TOTAL = meta.chExigida;

const porStatus = (s: string) => disciplinas.filter((d) => d.status === s);
const somaCr = (ds: Disciplina[]) => ds.reduce((a, d) => a + d.creditos, 0);
const somaCh = (ds: Disciplina[]) => ds.reduce((a, d) => a + chDe(d), 0);

const concluidas = disciplinas.filter(concluida);
const cursando = porStatus('cursando');

const crConcluidos = somaCr(concluidas);
const chConcluida = somaCh(concluidas);
const percentual = Math.round((chConcluida / CH_TOTAL) * 1000) / 10;

const crCursando = somaCr(cursando);
const crRestantes = meta.creditosExigidos - crConcluidos - crCursando;

const carga = cargaDaRota(ROTA);

// Horas por área, somando as obrigatórias da matriz.
const areas = new Map<string, number>();
for (const d of disciplinas) {
  areas.set(d.area, (areas.get(d.area) ?? 0) + chDe(d));
}
const chObrigatoria = somaCh(disciplinas);

export default function ProgressDashboard(): React.ReactElement {
  const outras = rotas.filter((r) => r.id !== ROTA);
  const {singular} = config.rotuloDia;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
        <Card
          title="Integralizado"
          value={`${percentual}%`}
          subtitle={`${chConcluida}h / ${CH_TOTAL}h`}
          color="#3b82f6"
        />
        <Card
          title="Créditos"
          value={`${crConcluidos} / ${meta.creditosExigidos}`}
          subtitle={`${crCursando} cursando · ${crRestantes} a cursar`}
          color="#8b5cf6"
        />
        <Card
          title="Disciplinas"
          value={`${concluidas.length} / ${disciplinas.length}`}
          subtitle="cursadas ou aproveitadas"
          color="#22c55e"
        />
        <Card
          title="Formatura"
          value={resumoDaRota(ROTA).formatura}
          subtitle={
            outras.length
              ? outras.map((r) => `${resumoDaRota(r.id).formatura} no ${r.titulo}`).join(' · ')
              : rotaPadrao.titulo
          }
          color="#f59e0b"
        />
      </div>

      <h3 style={{marginBottom: '8px'}}>Progresso geral</h3>
      <div
        style={{
          background: 'var(--ifm-color-emphasis-200)',
          borderRadius: '8px',
          height: '32px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '32px',
        }}>
        <div
          style={{
            background: 'linear-gradient(90deg, #22c55e, #3b82f6)',
            height: '100%',
            width: `${percentual}%`,
            borderRadius: '8px',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontWeight: 'bold',
            fontSize: '14px',
            color: 'var(--ifm-font-color-base)',
          }}>
          {chConcluida}h / {CH_TOTAL}h ({percentual}%)
        </span>
      </div>

      <h3>Carga por semestre letivo</h3>
      <p style={{fontSize: '14px', color: 'var(--ifm-color-emphasis-700)'}}>
        Cada {singular} tem {config.faixasPorDia} faixa{config.faixasPorDia === 1 ? '' : 's'} de
        aula.{' '}
        {config.diasLivresDesejados > 0
          ? `O teto de ${TETO_FAIXAS} faixas por semestre preserva ${diasLivres(config.diasLivresDesejados)} na semana.`
          : `O teto é a semana inteira: ${TETO_FAIXAS} faixas.`}{' '}
        Abaixo, o{' '}
        <strong>{rotaPadrao.titulo}</strong>
        {outras.length > 0 && (
          <>
            {' '}— a comparação entre rotas está no{' '}
            <Link to="/integralizacao">Planejamento de Integralização</Link>
          </>
        )}
        .
      </p>
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {[...carga.entries()].map(([s, {faixas, creditos}]) => {
          const atual = s === meta.semestreAtual;
          const ordinal = ordinalDe(s);
          const folga = folgaDaSemana(faixas);

          return (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: atual
                  ? '2px solid var(--ifm-color-primary)'
                  : '1px solid var(--ifm-color-emphasis-300)',
                background: atual ? 'var(--ifm-color-emphasis-100)' : 'transparent',
              }}>
              <div style={{flex: 1, minWidth: '140px'}}>
                <strong>{s}</strong>
                {ordinal && (
                  <span
                    style={{
                      marginLeft: '8px',
                      color: 'var(--ifm-color-emphasis-700)',
                      fontSize: '14px',
                    }}>
                    {ordinal}º semestre
                  </span>
                )}
              </div>
              <DiasVisual faixas={faixas} />
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--ifm-color-emphasis-700)',
                  whiteSpace: 'nowrap',
                }}>
                {faixas} faixas · {creditos} cr no total
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${folga.ok ? '#16a34a' : '#dc2626'}`,
                  color: folga.ok ? '#16a34a' : '#dc2626',
                  whiteSpace: 'nowrap',
                }}>
                {folga.texto}
              </span>
            </div>
          );
        })}
      </div>

      <h3 style={{marginTop: '32px'}}>Distribuição por área</h3>
      <p style={{fontSize: '14px', color: 'var(--ifm-color-emphasis-700)'}}>
        Carga horária das {disciplinas.length} disciplinas obrigatórias ({chObrigatoria}h).
        {meta.creditosEletivos > 0 &&
          ` As eletivas somam outras ${meta.creditosEletivos * config.horasPorCredito}h.`}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}>
        {[...areas.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([area, horas]) => (
            <AreaCard key={area} area={area} horas={horas} cor={corDaArea(area)} />
          ))}
      </div>
    </div>
  );
}

/** Um bloco por dia da semana, preenchido conforme as faixas ocupadas. */
function DiasVisual({faixas}: {faixas: number}) {
  const total = config.dias.length;
  const dias = faixas / config.faixasPorDia;
  return (
    <span
      style={{display: 'inline-flex', gap: '3px'}}
      title={`${dias} de ${total} ${config.rotuloDia.plural} com aula`}>
      {Array.from({length: total}, (_, i) => (
        <span
          key={i}
          style={{
            width: '10px',
            height: '18px',
            borderRadius: '2px',
            background: i < dias ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-300)',
          }}
        />
      ))}
    </span>
  );
}

function Card({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderTop: `4px solid ${color}`,
      }}>
      <div
        style={{
          fontSize: '13px',
          color: 'var(--ifm-color-emphasis-700)',
          marginBottom: '4px',
        }}>
        {title}
      </div>
      <div style={{fontSize: '28px', fontWeight: 'bold', color}}>{value}</div>
      <div style={{fontSize: '13px', color: 'var(--ifm-color-emphasis-600)'}}>{subtitle}</div>
    </div>
  );
}

function AreaCard({area, horas, cor}: {area: string; horas: number; cor: string}) {
  const pct = Math.round((horas / CH_TOTAL) * 100);
  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--ifm-color-emphasis-300)',
      }}>
      <div style={{fontSize: '13px', fontWeight: 600, marginBottom: '6px'}}>{area}</div>
      <div
        style={{
          background: 'var(--ifm-color-emphasis-200)',
          borderRadius: '4px',
          height: '8px',
          overflow: 'hidden',
        }}>
        <div style={{background: cor, height: '100%', width: `${pct}%`}} />
      </div>
      <div
        style={{
          fontSize: '12px',
          color: 'var(--ifm-color-emphasis-700)',
          marginTop: '4px',
        }}>
        {horas}h ({pct}%)
      </div>
    </div>
  );
}
