import {
  notaDaDisciplina,
  semestreDoOrdinal,
  type Disciplina,
  type SituacaoEfetiva,
} from '@akademos/core';
import { Button, PageHeader, Pill } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { estiloSituacao, ORDEM_LEGENDA } from '../componentes/situacao';
import { useAnalise } from '../dados/analise';
import { useFormatoNota } from '../dados/formato';
import s from './Percurso.module.css';

type Papel = 'selecionada' | 'requisito' | 'destrava' | null;

const ANEL: Record<Exclude<Papel, null>, string> = {
  selecionada: '0 0 0 2px var(--primary)',
  requisito: '0 0 0 2px var(--olive)',
  destrava: '0 0 0 2px var(--amber)',
};

export function Percurso() {
  const { t } = useLingui();
  const a = useAnalise();
  const fmt = useFormatoNota();
  const navigate = useNavigate();
  const { matriz, cursadas, aluno, instituicao } = a.dados;

  // Começa pela disciplina do insight mais urgente, se houver.
  const inicial =
    a.insights.find((i) => matriz.disciplinas.some((d) => d.codigo === i.alvo))?.alvo ??
    matriz.disciplinas[0]?.codigo ??
    '';
  const [selecionada, setSelecionada] = useState(inicial);

  const requisitosDe = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of matriz.prerequisitos) {
      if (p.tipo !== 'pre') continue;
      m.set(p.disciplinaCodigo, [...(m.get(p.disciplinaCodigo) ?? []), p.requerCodigo]);
    }
    return m;
  }, [matriz]);
  const destravaDe = (codigo: string) =>
    matriz.disciplinas.filter((d) => requisitosDe.get(d.codigo)?.includes(codigo));

  const sel = matriz.disciplinas.find((d) => d.codigo === selecionada) ?? matriz.disciplinas[0]!;
  const sitSel = a.situacoes.get(sel.codigo) ?? 'lib';
  const requisitosSel = (requisitosDe.get(sel.codigo) ?? [])
    .map((c) => matriz.disciplinas.find((d) => d.codigo === c))
    .filter((d): d is Disciplina => !!d);
  const destravaSel = destravaDe(sel.codigo);

  const papel = (d: Disciplina): Papel =>
    d.codigo === sel.codigo
      ? 'selecionada'
      : requisitosSel.includes(d)
        ? 'requisito'
        : destravaSel.includes(d)
          ? 'destrava'
          : null;

  const totalSemestres = Math.max(...matriz.disciplinas.map((d) => d.semestreSugerido));
  const colunas = Array.from({ length: totalSemestres }, (_, i) => {
    const n = i + 1;
    const ds = matriz.disciplinas.filter((d) => d.semestreSugerido === n);
    return {
      n,
      semestre: semestreDoOrdinal(aluno.ingresso, n),
      creditos: ds.reduce((t, d) => t + d.creditos, 0),
      ds,
    };
  });

  // Explicação no painel: insight sobre a disciplina ou a sua posição na matriz.
  const insight = a.insights.find((i) => i.alvo === sel.codigo && i.tipo !== 'lotacao');
  const destaque = insight
    ? insight.texto
    : destravaSel.length
      ? destravaSel.length === 1
        ? t`Exigida por 1 disciplina adiante na matriz.`
        : t`Exigida por ${destravaSel.length} disciplinas adiante na matriz.`
      : t`Não é exigida por nenhuma outra disciplina.`;

  const nota = notaDaDisciplina(sel.codigo, cursadas);
  const estiloSel = estiloSituacao(sitSel);
  const ofertadaNoProximo = a.dados.ofertas.some(
    (o) => o.semestre === a.proximoSemestre && o.disciplinaCodigo === sel.codigo,
  );

  return (
    <div className={s.pagina}>
      <PageHeader
        title={<Trans>Percurso</Trans>}
        subtitle={
          <Trans>
            Matriz {matriz.ano} · {matriz.creditosTotal} créditos · clique numa disciplina para ver
            o que ela exige e o que destrava
          </Trans>
        }
        aside={
          <div className={s.legenda} aria-label={t`Legenda`}>
            {ORDEM_LEGENDA.map((k) => {
              const e = estiloSituacao(k);
              return (
                <span key={k} className={s.legendaItem}>
                  <span className={s.amostra} style={{ background: e.fundo, borderColor: e.cor }} />
                  {e.rotulo}
                </span>
              );
            })}
          </div>
        }
      />
      <div className={s.corpo}>
        <div className={s.matriz}>
          <div className={s.colunas}>
            {colunas.map((col) => (
              <section
                key={col.n}
                className={s.coluna}
                aria-label={t`${col.n}º semestre, ${col.semestre}`}
              >
                <div className={s.cabecalho}>
                  <div className={s.cabecalhoTitulo}>
                    {col.n}º · {col.semestre}
                  </div>
                  <div className={s.cabecalhoSub}>
                    {col.creditos} cr {col.semestre === a.semestreAtual && <Trans>· atual</Trans>}
                  </div>
                </div>
                {col.ds.map((d) => (
                  <CartaoDisciplina
                    key={d.codigo}
                    disciplina={d}
                    situacao={a.situacoes.get(d.codigo) ?? 'lib'}
                    papel={papel(d)}
                    nota={notaDaDisciplina(d.codigo, cursadas)}
                    formatarNota={fmt.nota}
                    onSelecionar={() => setSelecionada(d.codigo)}
                  />
                ))}
              </section>
            ))}
          </div>
        </div>

        <aside className={s.painel} aria-live="polite" aria-label={t`Detalhes da disciplina`}>
          <div>
            <div className={s.painelCodigo}>
              {sel.codigo} · {sel.area}
            </div>
            <h2 className={s.painelNome}>{sel.nome}</h2>
            <div className={s.pilulas}>
              <Pill
                strong
                color={estiloSel.cor}
                background={sitSel === 'lib' ? 'var(--neutral-tint)' : estiloSel.fundo}
              >
                {estiloSel.rotulo}
              </Pill>
              <Pill outline>
                {sel.creditos} cr · {sel.cargaHoraria} h
              </Pill>
              <Pill outline>{nota !== null ? t`nota ${fmt.nota(nota)}` : t`sem nota`}</Pill>
            </div>
          </div>
          <div className={s.destaque}>{destaque}</div>
          <ListaRelacionadas
            titulo={t`Exige`}
            cor="var(--olive)"
            itens={requisitosSel}
            vazio={t`Nenhum pré-requisito.`}
            situacoes={a.situacoes}
            onSelecionar={setSelecionada}
          />
          <ListaRelacionadas
            titulo={t`Destrava`}
            cor="var(--amber-ink)"
            itens={destravaSel}
            vazio={t`Não destrava nenhuma.`}
            situacoes={a.situacoes}
            onSelecionar={setSelecionada}
          />
          {(sitSel === 'lib' || sitSel === 'pend') && (
            <Button onPress={() => void navigate({ to: '/planejar' })}>
              {ofertadaNoProximo ? (
                <Trans>Ver turmas em {a.proximoSemestre}</Trans>
              ) : (
                <Trans>Planejar {a.proximoSemestre}</Trans>
              )}
            </Button>
          )}
          <div className="ak-caption">
            {instituicao.sigla} · <Trans>sugerida no {sel.semestreSugerido}º semestre</Trans>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface CartaoProps {
  disciplina: Disciplina;
  situacao: SituacaoEfetiva;
  papel: Papel;
  nota: number | null;
  formatarNota: (n: number | null) => string;
  onSelecionar: () => void;
}

function CartaoDisciplina({
  disciplina: d,
  situacao,
  papel,
  nota,
  formatarNota,
  onSelecionar,
}: CartaoProps) {
  const { t } = useLingui();
  const e = estiloSituacao(situacao);
  const tag =
    papel === 'requisito'
      ? { texto: t`pré-requisito`, cor: 'var(--olive-ink)' }
      : papel === 'destrava'
        ? { texto: t`destrava`, cor: 'var(--amber-ink)' }
        : situacao === 'ok'
          ? null
          : { texto: e.rotulo, cor: e.cor };
  return (
    <button
      type="button"
      className={s.cartao}
      aria-pressed={papel === 'selecionada'}
      onClick={onSelecionar}
      style={{
        background: e.fundo,
        borderColor: e.cor,
        borderStyle: situacao === 'blq' ? 'dashed' : 'solid',
        boxShadow: papel ? ANEL[papel] : 'none',
      }}
    >
      <span className={s.cartaoTopo} style={{ color: e.cor }}>
        <span>{d.codigo}</span>
        <span>{nota !== null ? formatarNota(nota) : ''}</span>
      </span>
      <span className={s.cartaoNome}>{d.nome}</span>
      {tag && (
        <span className={s.cartaoTag} style={{ color: tag.cor }}>
          {tag.texto}
        </span>
      )}
    </button>
  );
}

function ListaRelacionadas({
  titulo,
  cor,
  itens,
  vazio,
  situacoes,
  onSelecionar,
}: {
  titulo: string;
  cor: string;
  itens: Disciplina[];
  vazio: string;
  situacoes: Map<string, SituacaoEfetiva>;
  onSelecionar: (codigo: string) => void;
}) {
  return (
    <div>
      <div className={s.rotuloLista} style={{ color: cor }}>
        {titulo}
      </div>
      {itens.map((d) => {
        const e = estiloSituacao(situacoes.get(d.codigo) ?? 'lib');
        return (
          <button
            key={d.codigo}
            type="button"
            className={s.itemLista}
            onClick={() => onSelecionar(d.codigo)}
          >
            <span>{d.nome}</span>
            <span style={{ color: e.cor, fontSize: 12 }}>{e.rotulo}</span>
          </button>
        );
      })}
      {!itens.length && <div className={s.vazio}>{vazio}</div>}
    </div>
  );
}
