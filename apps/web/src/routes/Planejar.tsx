import {
  alternarTurma,
  chanceDeVaga,
  compararSemestres,
  descreverHorarios,
  resumirPlano,
  ROTULO_DIA,
  rotuloFaixa,
  tempoDecorrido,
  type Oferta,
} from '@akademos/core';
import { Kpi, Note, PageHeader, ProgressBar } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { salvarPlano } from '../dados/acoes';
import { useAnalise } from '../dados/analise';
import { NovaTurma } from './planejar/NovaTurma';
import s from './Planejar.module.css';

const FAIXA_PRIORIDADE = 3;

function corDaChance(c: number): string {
  return c >= 80 ? 'var(--olive-ink)' : c >= 55 ? 'var(--amber-ink)' : 'var(--danger)';
}

export function Planejar() {
  const { t } = useLingui();
  const a = useAnalise();
  const { dados, proximoSemestre: semestre } = a;
  const { matriz, instituicao } = dados;
  const nome = (codigo: string) =>
    matriz.disciplinas.find((d) => d.codigo === codigo)?.nome ?? codigo;

  const ofertas = useMemo(
    () => dados.ofertas.filter((o) => o.semestre === semestre),
    [dados.ofertas, semestre],
  );
  const plano = dados.planos.find((p) => p.semestre === semestre);
  const escolhidas = new Set(plano?.turmas ?? []);
  const turmasDoPlano = ofertas.filter((o) => escolhidas.has(o.id));
  const resumo = resumirPlano({
    matriz,
    instituicao,
    cursadas: dados.cursadas,
    semestreAtual: a.semestreAtual,
    turmas: turmasDoPlano,
    faixaPrioridade: FAIXA_PRIORIDADE,
  });

  const alternar = (o: Oferta) =>
    void salvarPlano(
      dados.aluno.id,
      semestre,
      alternarTurma([...escolhidas], o.id, ofertas),
      plano,
    );

  // Disciplinas com turma no próximo semestre, separadas por elegibilidade.
  const porDisciplina = new Map<string, Oferta[]>();
  for (const o of ofertas)
    porDisciplina.set(o.disciplinaCodigo, [...(porDisciplina.get(o.disciplinaCodigo) ?? []), o]);
  const disponiveis = [...porDisciplina.keys()]
    .filter((c) => a.ctx.elegivel(c) || (a.situacoes.get(c) === 'blq' && requisitosEmCurso(c)))
    .sort(
      (x, y) =>
        (matriz.disciplinas.find((d) => d.codigo === x)?.semestreSugerido ?? 0) -
        (matriz.disciplinas.find((d) => d.codigo === y)?.semestreSugerido ?? 0),
    );
  const bloqueadas = [...porDisciplina.keys()].filter(
    (c) => !disponiveis.includes(c) && a.situacoes.get(c) === 'blq',
  );

  function requisitosDe(codigo: string) {
    return matriz.prerequisitos
      .filter((p) => p.disciplinaCodigo === codigo && p.tipo === 'pre')
      .map((p) => p.requerCodigo);
  }
  function requisitosEmCurso(codigo: string) {
    const r = requisitosDe(codigo);
    return r.length > 0 && r.every((x) => ['ok', 'cur'].includes(a.situacoes.get(x) ?? ''));
  }

  const notaDaDisciplina = (codigo: string): string => {
    const d = matriz.disciplinas.find((x) => x.codigo === codigo);
    const destrava = matriz.prerequisitos
      .filter((p) => p.requerCodigo === codigo)
      .map((p) => nome(p.disciplinaCodigo));
    const emCurso = requisitosDe(codigo)
      .filter((r) => a.situacoes.get(r) === 'cur')
      .map(nome);
    const partes: string[] = [];
    if (a.situacoes.get(codigo) === 'pend') partes.push(t`Adiada`);
    if (emCurso.length) partes.push(t`Condicionada à aprovação em ${emCurso.join(' e ')}`);
    if (destrava.length) partes.push(t`destrava ${destrava.join(', ')}`);
    if (d?.tipo === 'eletiva') partes.push(t`Eletiva`);
    const texto = partes.join(' · ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };

  // Avisos de impacto.
  const formaturaInsight = a.insights.find((i) => i.rotulo === 'Formatura');
  const atrasou =
    resumo.formatura &&
    resumo.formaturaIdeal &&
    compararSemestres(resumo.formatura, resumo.formaturaIdeal) > 0;
  const faltando = matriz.disciplinas.filter((d) => {
    if (!a.ctx.elegivel(d.codigo) || turmasDoPlano.some((o) => o.disciplinaCodigo === d.codigo))
      return false;
    return a.insights.some((i) => i.rotulo === 'Formatura' && i.alvo === d.codigo);
  });
  const leitura = ofertas
    .map((o) => o.atualizadaEm)
    .filter(Boolean)
    .sort()
    .at(-1);
  const sistema = { sigaa: 'SIGAA', jupiter: 'JúpiterWeb', outro: t`lançamento manual` }[
    instituicao.sistema
  ];

  const dias = instituicao.grade.dias;
  const celula = (dia: string, slot: number) =>
    turmasDoPlano.filter((o) => o.horarios.some((h) => h.dia === dia && h.slot === slot));
  const rotuloCelula = (o: Oferta) =>
    o.titulo ? { t: o.titulo, s: t`Eletiva` } : { t: nome(o.disciplinaCodigo), s: o.turma };

  return (
    <div className={s.pagina}>
      <PageHeader
        title={<Trans>Planejar {semestre}</Trans>}
        subtitle={
          ofertas.length ? (
            <Trans>
              Oferta e pré-matrícula lidas do {sistema} {instituicao.sigla}
              {leitura ? ` ${tempoDecorrido(new Date(leitura), a.agora)}` : ''} · sua prioridade:{' '}
              {FAIXA_PRIORIDADE}ª faixa (regular, {a.integralizacao.percentual}% integralizado)
            </Trans>
          ) : (
            <Trans>Ainda não há turmas de {semestre} neste aparelho.</Trans>
          )
        }
      />
      <div className={s.kpis}>
        <Kpi compact label={t`Créditos`} value={String(resumo.creditos)} />
        <Kpi compact label={t`Horas na semana`} value={`${resumo.horas} h`} />
        <Kpi
          compact
          label={t`Conflitos`}
          value={String(resumo.conflitos.length)}
          valueColor={resumo.conflitos.length ? 'var(--danger)' : 'var(--olive-ink)'}
        />
        <Kpi
          compact
          label={t`Formatura`}
          value={resumo.formatura ?? '—'}
          valueColor={atrasou ? 'var(--danger)' : 'var(--olive-ink)'}
        />
      </div>
      <div className={s.corpo}>
        <section className={s.coluna} aria-labelledby="disponiveis">
          <h2 id="disponiveis" className="ak-h2 ak-h2--sm">
            <Trans>Disponíveis para você</Trans>
          </h2>
          {disponiveis.map((codigo) => {
            const d = matriz.disciplinas.find((x) => x.codigo === codigo);
            const nota = notaDaDisciplina(codigo);
            return (
              <div key={codigo} className={s.disciplina}>
                <div className={s.discTopo}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{nome(codigo)}</span>{' '}
                    <span className="ak-mono ak-muted" style={{ fontSize: 11 }}>
                      {codigo} · {d?.creditos} cr
                    </span>
                  </div>
                  {nota && <span className={s.discNota}>{nota}</span>}
                </div>
                {porDisciplina.get(codigo)!.map((o) => {
                  const na = escolhidas.has(o.id);
                  const chance = chanceDeVaga(o, FAIXA_PRIORIDADE);
                  const lotada = o.interessados > o.vagas;
                  return (
                    <div key={o.id} className={`${s.turma} ${na ? s.turmaEscolhida : ''}`}>
                      <div>
                        <div className={s.turmaTitulo}>
                          {o.titulo ?? o.turma} · {descreverHorarios(o.horarios, instituicao.grade)}
                        </div>
                        <div className={s.turmaSub}>
                          {[o.professor, o.local].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className={s.lotacao}>
                        <ProgressBar
                          size="md"
                          label={t`Lotação de ${o.turma}`}
                          value={o.vagas ? (o.interessados / o.vagas) * 100 : 0}
                          color={lotada ? 'var(--danger)' : 'var(--primary)'}
                        />
                        <div className={s.lotacaoTexto}>
                          <Trans>
                            {o.interessados} interessados / {o.vagas} vagas ·{' '}
                            <span style={{ color: corDaChance(chance), fontWeight: 600 }}>
                              {chance}% de vaga
                            </span>
                          </Trans>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={s.alternar}
                        aria-pressed={na}
                        onClick={() => alternar(o)}
                      >
                        {na ? <Trans>Na grade ✓</Trans> : <Trans>Adicionar</Trans>}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {bloqueadas.length > 0 && (
            <div className={s.bloqueadas}>
              <Trans>Bloqueadas neste semestre:</Trans>{' '}
              {bloqueadas
                .map((c) => {
                  const faltam = requisitosDe(c)
                    .filter((r) => !['ok', 'cur'].includes(a.situacoes.get(r) ?? ''))
                    .map(nome);
                  return `${nome(c)} (${t`exige ${faltam.join(' e ')}`})`;
                })
                .join(', ')}
              .
            </div>
          )}
          <NovaTurma semestre={semestre} />
        </section>

        <section className={`${s.coluna} ${s.semana}`} aria-labelledby="semana">
          <h2 id="semana" className="ak-h2 ak-h2--sm">
            <Trans>Sua semana</Trans>
          </h2>
          <div className={s.grade} style={{ ['--dias' as string]: dias.length }}>
            <div className={s.gradeLinha} aria-hidden>
              <div />
              {dias.map((d) => (
                <div key={d} className={s.dia}>
                  {ROTULO_DIA[d]}
                </div>
              ))}
            </div>
            {instituicao.grade.faixas.map((f, slot) => (
              <div key={slot} className={s.gradeLinha}>
                <div className={s.hora}>{rotuloFaixa(f)}</div>
                {dias.map((dia) => {
                  const os = celula(dia, slot);
                  const conflito = os.length > 1;
                  const unica = os[0];
                  return (
                    <div
                      key={dia}
                      className={`${s.celula} ${conflito ? s.celulaConflito : unica ? s.celulaOcupada : ''}`}
                      aria-label={`${ROTULO_DIA[dia]} ${rotuloFaixa(f)}: ${os.map((o) => nome(o.disciplinaCodigo)).join(' e ') || t`livre`}`}
                    >
                      {conflito ? (
                        <>
                          <span className={s.celulaTitulo}>
                            <Trans>Conflito</Trans>
                          </span>
                          <span className={s.celulaSub}>
                            {os.map((o) => nome(o.disciplinaCodigo).split(' ')[0]).join(' × ')}
                          </span>
                        </>
                      ) : unica ? (
                        <>
                          <span className={s.celulaTitulo}>{rotuloCelula(unica).t}</span>
                          <span className={s.celulaSub}>{rotuloCelula(unica).s}</span>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {atrasou &&
            faltando.map((d) => {
              const destrava = matriz.prerequisitos
                .filter((p) => p.requerCodigo === d.codigo)
                .map((p) => nome(p.disciplinaCodigo));
              return (
                <Note key={d.codigo} tone="danger">
                  <Trans>
                    Sem {d.nome}, {destrava.join(' e ') || t`o restante`} fica para depois e a
                    formatura passa para {resumo.formatura}.
                  </Trans>
                </Note>
              );
            })}
          {atrasou && !faltando.length && formaturaInsight === undefined && (
            <Note tone="danger">
              <Trans>
                Com este plano, a formatura fica em {resumo.formatura}; o melhor possível é{' '}
                {resumo.formaturaIdeal}.
              </Trans>
            </Note>
          )}
          {resumo.conflitos.length > 0 && (
            <Note tone="danger">
              {resumo.conflitos.length === 1 ? (
                <Trans>1 faixa com choque de horário. Troque de turma ao lado.</Trans>
              ) : (
                <Trans>
                  {resumo.conflitos.length} faixas com choque de horário. Troque de turma ao lado.
                </Trans>
              )}
            </Note>
          )}
          {turmasDoPlano.length > 0 && (
            <Note tone="positive">
              {resumo.diasLivres.length ? (
                <Trans>
                  Dias livres: {resumo.diasLivres.map((d) => ROTULO_DIA[d]).join(', ')}.
                </Trans>
              ) : (
                <Trans>Semana sem dia livre.</Trans>
              )}{' '}
              <Trans>Menor chance de vaga no plano: {resumo.menorChance}%.</Trans>
              {resumo.menorChance < 55 && (
                <>
                  {' '}
                  <Trans>Escolha uma turma reserva.</Trans>
                </>
              )}
            </Note>
          )}
        </section>
      </div>
    </div>
  );
}
