import { descreverHorarios, normalizarNota } from '@akademos/core';
import { Card, Kpi, PageHeader, ProgressBar } from '@akademos/ui';
import { plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { CartaoInsight } from '../componentes/CartaoInsight';
import { COR_RISCO, rotuloRisco } from '../componentes/risco';
import { useAnalise } from '../dados/analise';
import { useFormatoNota } from '../dados/formato';
import { dataPorExtenso, folgaDaSemana, resumo, saudacao } from './inicio-textos';
import s from './Inicio.module.css';

export function Inicio() {
  const { t } = useLingui();
  const a = useAnalise();
  const fmt = useFormatoNota();
  const { dados, integralizacao: integ } = a;
  const aprov = dados.escala.aprovacao;
  const formatura = a.formatura.formatura;
  const insightFormatura = a.insights.find((i) => i.rotulo === 'Formatura');
  const totalSemestres = formatura ? a.ordinalAtual + a.formatura.cronograma.length : null;
  const cursando = dados.cursadas.filter(
    (c) => c.situacao === 'cursando' && c.semestre === a.semestreAtual,
  );
  const temComunidade = a.comunidade !== null;

  return (
    <div className={s.pagina}>
      <PageHeader
        hero
        eyebrow={dataPorExtenso(a.agora)}
        title={saudacao(a.agora, dados.aluno.nome)}
        aside={<div className={s.resumo}>{resumo(a)}</div>}
      />

      <div className={s.kpis}>
        <Kpi
          label={t`Integralizado`}
          value={`${integ.percentual}%`}
          progress={integ.percentual}
          caption={t`${integ.creditosCumpridos} de ${integ.creditosTotal} créditos`}
        />
        <Kpi
          label={t`Média ponderada`}
          value={fmt.nota(a.media)}
          progress={
            fmt.ocultar || a.media === null ? 0 : normalizarNota(a.media, dados.escala) * 10
          }
          caption={t`aprovação ≥ ${fmt.nota(aprov)} · ${plural(a.notasLancadas, { one: '# nota', other: '# notas' })}`}
        />
        <Kpi
          label={t`Formatura prevista`}
          value={formatura ?? '—'}
          progress={totalSemestres ? ((a.ordinalAtual - 0.5) / totalSemestres) * 100 : 0}
          caption={
            !formatura
              ? (a.formatura.impedimento ?? t`sem previsão`)
              : insightFormatura
                ? t`mantida se ${dados.matriz.disciplinas.find((d) => d.codigo === insightFormatura.alvo)?.nome} entrar em ${a.proximoSemestre}`
                : t`no ritmo do seu plano`
          }
        />
        <Kpi
          label={t`Esta semana`}
          value={`${a.horasSemanaAtual} h`}
          progress={(a.horasSemanaAtual / 25) * 100}
          caption={a.turmasAtuais.length ? folgaDaSemana(a) : t`sem turmas registradas`}
        />
      </div>

      <div className={s.colunas}>
        <section className={s.secao} aria-labelledby="atencao">
          <div className={s.secaoTopo}>
            <h2 id="atencao" className="ak-h2">
              <Trans>O que merece atenção</Trans>
            </h2>
            <Link to="/insights" className={s.linkPequeno}>
              <Trans>Todos os insights</Trans>
            </Link>
          </div>
          {a.insights.slice(0, 3).map((i) => (
            <CartaoInsight key={i.id} insight={i} />
          ))}
          {!a.insights.length && (
            <Card>
              <span className="ak-muted ak-small">
                <Trans>Nada pedindo atenção agora.</Trans>
              </span>
            </Card>
          )}
        </section>

        <section className={s.secao} aria-labelledby="semestre">
          <h2 id="semestre" className="ak-h2">
            <Trans>Este semestre</Trans>
          </h2>
          <Card padding="none">
            {cursando.map((c) => {
              const d = dados.matriz.disciplinas.find((x) => x.codigo === c.disciplinaCodigo);
              const turma = a.turmasAtuais.find((o) => o.disciplinaCodigo === c.disciplinaCodigo);
              const p = a.previsoes.get(c.disciplinaCodigo);
              return (
                <div key={c.id} className={s.cursando}>
                  <div className={s.nomeDisc}>{d?.nome ?? c.disciplinaCodigo}</div>
                  <div className={s.risco} style={{ color: p ? COR_RISCO[p.nivel] : undefined }}>
                    {p ? rotuloRisco(p.nivel) : '—'}
                  </div>
                  <div className={s.meta}>
                    <span className="ak-mono">{c.disciplinaCodigo}</span>
                    {turma && <> · {descreverHorarios(turma.horarios, dados.instituicao.grade)}</>}
                  </div>
                  <div className={s.meta}>
                    {p && <Trans>prevista {fmt.intervalo(p.intervalo)}</Trans>}
                  </div>
                </div>
              );
            })}
            {cursando.length ? (
              <div className={s.nota}>
                {temComunidade ? (
                  <Trans>
                    Previsão a partir das suas notas e de históricos anônimos da comunidade desta
                    matriz.
                  </Trans>
                ) : (
                  <Trans>Previsão a partir das suas notas.</Trans>
                )}
              </div>
            ) : (
              <div className={s.vazio}>
                <Trans>Nenhuma disciplina em curso neste semestre.</Trans>
              </div>
            )}
          </Card>

          <h2 className="ak-h2" style={{ marginTop: 12 }}>
            <Trans>Por área</Trans>
          </h2>
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {a.progressoArea.map((p) => (
              <div key={p.area} className={s.area}>
                <span>{p.area}</span>
                <ProgressBar
                  size="md"
                  color="var(--olive)"
                  label={p.area}
                  value={(p.creditosCumpridos / p.creditosTotal) * 100}
                />
                <span className={s.areaValor}>
                  {p.creditosCumpridos}/{p.creditosTotal} cr
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
