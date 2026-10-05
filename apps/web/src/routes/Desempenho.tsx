import {
  desnormalizarNota,
  disciplinaQueCruzaAreas,
  formatarInteiro,
  formatarNota,
  normalizarNota,
} from '@akademos/core';
import { Card, PageHeader, ProgressBar } from '@akademos/ui';
import { plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { COR_RISCO, rotuloRisco } from '../componentes/risco';
import { useAnalise } from '../dados/analise';
import { useFormatoNota } from '../dados/formato';
import s from './Desempenho.module.css';

function corDaMedia(m10: number): string {
  return m10 >= 8 ? 'var(--olive-ink)' : m10 >= 7 ? 'var(--primary)' : 'var(--amber-ink)';
}

export function Desempenho() {
  const { t } = useLingui();
  const a = useAnalise();
  const fmt = useFormatoNota();
  const { escala, matriz, cursadas, curso, instituicao } = a.dados;
  const n10 = (n: number) => normalizarNota(n, escala);

  // Barra projetada do semestre em curso: centro das faixas previstas.
  const previstas = [...a.previsoes.values()];
  const projecao = previstas.length
    ? previstas.reduce((s, p) => s + (p.intervalo.min + p.intervalo.max) / 2, 0) / previstas.length
    : null;
  const barras = [
    ...a.mediasSemestre.map((m) => ({
      rotulo: m.semestre,
      valor: n10(m.media),
      exibido: m.media,
      projetada: false,
    })),
    ...(projecao !== null
      ? [
          {
            rotulo: a.semestreAtual,
            valor: projecao,
            exibido: desnormalizarNota(projecao, escala),
            projetada: true,
          },
        ]
      : []),
  ];

  const areas = [...a.mediasArea].map((m) => ({ ...m, m10: n10(m.media) }));
  // Comparação só entre áreas com notas suficientes para dizer algo.
  const notasPorArea = (area: string) =>
    cursadas.filter(
      (c) =>
        c.nota !== null &&
        matriz.disciplinas.find((d) => d.codigo === c.disciplinaCodigo)?.area === area,
    ).length;
  const comparaveis = areas.filter((m) => notasPorArea(m.area) >= 3);
  const melhor = [...comparaveis].sort((x, y) => y.m10 - x.m10)[0];
  const pior = [...comparaveis].sort((x, y) => x.m10 - y.m10)[0];
  const diferenca = melhor && pior ? Math.round(melhor.m10 - pior.m10) : 0;
  const cruza =
    melhor && pior && diferenca >= 1
      ? disciplinaQueCruzaAreas(matriz, cursadas, melhor.area, pior.area)
      : null;

  const cursando = cursadas.filter(
    (c) => c.situacao === 'cursando' && c.semestre === a.semestreAtual,
  );
  const nome = (codigo: string) =>
    matriz.disciplinas.find((d) => d.codigo === codigo)?.nome ?? codigo;
  const stats = a.comunidade;
  const correlacoes = stats
    ? stats.correlacoes
        .filter((c) => c.n >= stats.k && a.ctx.nota10(c.de) !== null)
        .sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
    : [];

  return (
    <div className={s.pagina}>
      <PageHeader
        title={<Trans>Desempenho</Trans>}
        subtitle={
          <Trans>
            Média ponderada por créditos · escala {escala.min}–{escala.max} · aprovação ≥{' '}
            {formatarNota(escala.aprovacao)}
          </Trans>
        }
      />
      <div className={s.duas}>
        <Card padding="lg" as="section">
          <div className={s.topo}>
            <h2 className="ak-h2 ak-h2--sm">
              <Trans>Média por semestre</Trans>
            </h2>
            <span className="ak-small ak-muted">
              <Trans>
                geral <strong style={{ color: 'var(--ink)' }}>{fmt.nota(a.media)}</strong>
              </Trans>
            </span>
          </div>
          <div className={s.barras} aria-hidden>
            {barras.map((b) => (
              <div key={b.rotulo} className={s.barra}>
                <div className={s.barraValor}>
                  {b.projetada && !fmt.ocultar ? '~' : ''}
                  {fmt.nota(b.exibido)}
                </div>
                <div
                  className={s.barraCorpo}
                  style={{
                    height: fmt.ocultar ? '50%' : `${b.valor * 10}%`,
                    background: b.projetada ? 'var(--primary-tint)' : 'var(--primary)',
                    borderStyle: b.projetada ? 'dashed' : 'solid',
                  }}
                />
              </div>
            ))}
          </div>
          <div className={s.rotulos} aria-hidden>
            {barras.map((b) => (
              <span key={b.rotulo}>{b.rotulo}</span>
            ))}
          </div>
          <table className="ak-sr-only">
            <caption>{t`Média por semestre`}</caption>
            <tbody>
              {barras.map((b) => (
                <tr key={b.rotulo}>
                  <th>{b.rotulo}</th>
                  <td>
                    {b.projetada ? t`projeção ` : ''}
                    {fmt.nota(b.exibido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card
          padding="lg"
          as="section"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <h2 className="ak-h2 ak-h2--sm">
            <Trans>Por área</Trans>
          </h2>
          {areas.map((m) => (
            <div key={m.area} className={s.area}>
              <span>{m.area}</span>
              <ProgressBar
                size="lg"
                label={m.area}
                value={fmt.ocultar ? 0 : m.m10 * 10}
                color={corDaMedia(m.m10)}
              />
              <span className={s.areaValor}>{fmt.nota(m.media)}</span>
            </div>
          ))}
          {melhor && pior && diferenca >= 1 && (
            <div className={s.comentario}>
              <Trans>
                Você rende cerca de {plural(diferenca, { one: '# ponto', other: '# pontos' })} a
                mais em {melhor.area} do que em {pior.area}.
              </Trans>{' '}
              {cruza && <Trans>{cruza.nome} exige as duas.</Trans>}
            </div>
          )}
          {!areas.length && (
            <div className={s.comentario}>
              <Trans>Lance notas para ver a média por área.</Trans>
            </div>
          )}
        </Card>
      </div>

      <section className={s.secao} aria-labelledby="risco">
        <h2 id="risco" className="ak-h2">
          <Trans>Risco neste semestre</Trans>
        </h2>
        <Card padding="none" className={s.tabela}>
          <table>
            <thead>
              <tr>
                <th>
                  <Trans>Disciplina</Trans>
                </th>
                <th>
                  <Trans>Nota prevista</Trans>
                </th>
                <th>
                  <Trans>Risco</Trans>
                </th>
                <th>
                  <Trans>Por quê</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {cursando.map((c) => {
                const p = a.previsoes.get(c.disciplinaCodigo);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{nome(c.disciplinaCodigo)}</td>
                    <td className="ak-mono" style={{ fontSize: 12.5 }}>
                      {p ? fmt.intervalo(p.intervalo) : '—'}
                    </td>
                    <td style={{ color: p ? COR_RISCO[p.nivel] : undefined, fontWeight: 600 }}>
                      {p ? rotuloRisco(p.nivel) : '—'}
                    </td>
                    <td style={{ color: 'var(--ink-body)', fontSize: 13 }}>
                      {p
                        ? fmt.ocultar
                          ? p.motivo
                          : p.porque
                        : t`Sem notas suficientes para prever.`}
                    </td>
                  </tr>
                );
              })}
              {!cursando.length && (
                <tr>
                  <td colSpan={4} className="ak-muted">
                    <Trans>Nenhuma disciplina em curso.</Trans>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      <section className={s.secao} aria-labelledby="correlacoes">
        <h2 id="correlacoes" className="ak-h2">
          <Trans>Correlações na sua matriz</Trans>
        </h2>
        <div className="ak-small ak-muted">
          {stats ? (
            <Trans>
              Quanto a nota numa disciplina antecipa a nota em outra, em históricos anônimos de{' '}
              {curso.nome} · {instituicao.sigla}.
            </Trans>
          ) : (
            <Trans>
              Ainda não há históricos anônimos suficientes desta matriz (mínimo de 10 por par de
              disciplinas).
            </Trans>
          )}
          {stats?.demonstracao && (
            <>
              {' '}
              <Trans>Dados de demonstração.</Trans>
            </>
          )}
        </div>
        <div className={s.correlacoes}>
          {correlacoes.map((c) => {
            const x = a.ctx.nota10(c.de)!;
            const centro = c.intercepto + c.inclinacao * x;
            const meia = Math.max(0.4, c.residuo * 0.5);
            const prev = {
              min: Math.round(Math.max(0, centro - meia) * 10) / 10,
              max: Math.round(Math.min(10, centro + meia) * 10) / 10,
            };
            return (
              <Card key={`${c.de}-${c.para}`} className={s.correlacao} padding="none">
                <div className={s.par}>
                  {nome(c.de)} <span style={{ color: 'var(--ink-3)' }}>→</span> {nome(c.para)}
                </div>
                <div className={s.numeros}>
                  <span>
                    r ={' '}
                    <strong style={{ color: 'var(--ink)' }}>
                      {formatarNota(c.r, { casas: 2 })}
                    </strong>
                  </span>
                  <span>
                    <Trans>{formatarInteiro(c.n)} históricos</Trans>
                  </span>
                </div>
                <div className={s.previsto}>
                  <Trans>
                    Sua nota {fmt.nota(x)} → prevista <strong>{fmt.intervalo(prev)}</strong>
                  </Trans>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
