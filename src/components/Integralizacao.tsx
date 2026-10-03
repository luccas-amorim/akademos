import React from 'react';
import Link from '@docusaurus/Link';
import {
  type SemestreDaRota,
  CONCLUIDA,
  COR_STATUS,
  MAXIMO_FAIXAS,
  ROTULO_STATUS,
  cenarios,
  config,
  corDaRota,
  disciplinas,
  faixasDe,
  folgaDaSemana,
  meta,
  ordinalDe,
  resumoDaRota,
  rotaPadrao,
  rotas,
  vagasEletivas,
} from '@site/src/lib/grade';

/**
 * Planejamento de integralização: o que falta cumprir, agrupado por semestre
 * letivo, sem entrar em dia da semana. Gerado de src/data/curriculo.json.
 *
 * A unidade de ocupação é a FAIXA de horário, não o crédito (ver config em
 * curriculo.json). Quando há mais de uma rota em `cenarios`, tudo aqui é
 * calculado uma vez por rota.
 */

const CINZA = 'var(--ifm-color-emphasis-700)';

/** Uma linha da tabela do semestre — disciplina ou vaga de eletiva. */
type Linha = {
  chave: string;
  codigo: string;
  nome: string;
  slug?: string;
  creditos: number;
  faixas: number;
  serie: number;
  status?: string;
  etiqueta?: string;
};

function linhasDe(semestre: string, rota: string): Linha[] {
  const linhas: Linha[] = [];

  for (const d of disciplinas) {
    if (d.plano?.[rota] !== semestre) continue;
    const faixas = faixasDe(d, rota);
    linhas.push({
      chave: d.codigo,
      codigo: d.codigo,
      nome: d.nome,
      slug: d.slug,
      creditos: d.creditos,
      faixas,
      serie: d.serie,
      status: d.status,
      etiqueta: d.foraDaGradeEm?.[rota] ?? (faixas === 0 ? 'fora da grade' : undefined),
    });
  }

  for (const e of vagasEletivas) {
    if (e.plano[rota] !== semestre) continue;
    const faixas = faixasDe(e, rota);
    linhas.push({
      chave: e.rotulo,
      codigo: '—',
      nome: e.rotulo,
      creditos: e.creditos,
      faixas,
      serie: e.serie,
      // O rótulo já diz que é eletiva; etiqueta só quando não custa faixa.
      etiqueta: e.foraDaGradeEm?.[rota] ?? (faixas === 0 ? 'fora da grade' : undefined),
    });
  }

  return linhas.sort(
    (a, b) => b.faixas - a.faixas || b.creditos - a.creditos || a.codigo.localeCompare(b.codigo),
  );
}

export default function Integralizacao(): React.ReactElement {
  const varias = rotas.length > 1;
  const tronco = cenarios.troncoComum;

  const crConcluidos = disciplinas
    .filter((d) => CONCLUIDA.has(d.status))
    .reduce((a, d) => a + d.creditos, 0);
  const crACumprir =
    disciplinas.filter((d) => !CONCLUIDA.has(d.status)).reduce((a, d) => a + d.creditos, 0) +
    meta.creditosEletivos;

  // As rotas divergem no primeiro semestre que não é do tronco comum.
  const decisaoAte = rotas
    .flatMap((r) => r.semestres.map((s) => s.semestre))
    .sort()[0];

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '28px',
        }}>
        <Indicador
          rotulo="Já integralizado"
          valor={`${crConcluidos} cr`}
          sub="cursadas e aproveitadas"
          cor="#22c55e"
        />
        <Indicador
          rotulo="A cumprir"
          valor={`${crACumprir} cr`}
          sub={varias ? 'o mesmo em todas as rotas' : 'com as eletivas'}
          cor="#8b5cf6"
        />
        {rotas.map((r) => {
          const resumo = resumoDaRota(r.id);
          return (
            <Indicador
              key={r.id}
              rotulo={r.titulo}
              valor={resumo.formatura}
              sub={`${resumo.faixasACumprir} faixas · ${resumo.semestresComFolga} de ${resumo.semestresFuturos} semestres com ${config.rotuloDia.singular} livre`}
              cor={corDaRota(r.id)}
            />
          );
        })}
      </div>

      {tronco.length > 0 && (
        <>
          <Cabecalho
            titulo="Tronco comum"
            detalhe={`${tronco.map((s) => s.semestre).join(' · ')}${varias ? ' — idêntico em todas as rotas' : ''}`}
            cor="#0d9488"
          />
          {tronco.map((s) => (
            <CartaoSemestre key={s.semestre} semestre={s} rota={rotaPadrao.id} />
          ))}
        </>
      )}

      {varias && decisaoAte && (
        <div
          style={{
            margin: '32px 0 24px',
            padding: '16px 18px',
            borderRadius: '12px',
            border: '1px solid var(--ifm-color-warning-dark)',
            borderLeft: '5px solid var(--ifm-color-warning-dark)',
            background: 'var(--ifm-color-emphasis-100)',
          }}>
          <strong>As rotas se separam em {decisaoAte}</strong>
          {cenarios.notaDaDecisao && (
            <p style={{margin: '8px 0 0', fontSize: '14px'}}>{cenarios.notaDaDecisao}</p>
          )}
        </div>
      )}

      {rotas.map((r) => {
        const resumo = resumoDaRota(r.id);
        return (
          <section key={r.id} style={{marginBottom: '40px'}}>
            <Cabecalho
              titulo={r.titulo}
              detalhe={[
                r.subtitulo,
                `formatura em ${resumo.formatura}`,
                `${resumo.faixasACumprir} faixas`,
              ]
                .filter(Boolean)
                .join(' · ')}
              cor={corDaRota(r.id)}
            />
            {r.resumo && (
              <p style={{fontSize: '14px', color: CINZA, marginBottom: '20px'}}>{r.resumo}</p>
            )}

            {r.semestres.map((s) => (
              <CartaoSemestre key={s.semestre} semestre={s} rota={r.id} />
            ))}

            {r.nota && (
              <p
                style={{
                  fontSize: '14px',
                  margin: '16px 0 0',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'var(--ifm-color-emphasis-100)',
                }}>
                <strong>Nota — {r.titulo}:</strong> {r.nota}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Cabecalho({titulo, detalhe, cor}: {titulo: string; detalhe: string; cor: string}) {
  return (
    <div style={{margin: '0 0 12px', borderLeft: `4px solid ${cor}`, paddingLeft: '12px'}}>
      <div style={{fontSize: '20px', fontWeight: 700}}>{titulo}</div>
      <div style={{fontSize: '13px', color: CINZA}}>{detalhe}</div>
    </div>
  );
}

function CartaoSemestre({semestre, rota}: {semestre: SemestreDaRota; rota: string}) {
  const linhas = linhasDe(semestre.semestre, rota);
  const faixas = linhas.reduce((a, l) => a + l.faixas, 0);
  const creditos = linhas.reduce((a, l) => a + l.creditos, 0);
  const folga = folgaDaSemana(faixas);
  const ordinal = ordinalDe(semestre.semestre);

  return (
    <div
      style={{
        marginBottom: '20px',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'var(--ifm-color-emphasis-100)',
          borderBottom: '1px solid var(--ifm-color-emphasis-300)',
        }}>
        <strong style={{fontSize: '17px'}}>{semestre.semestre}</strong>
        <span style={{fontSize: '13px', color: CINZA}}>
          {ordinal ? `${ordinal}º · ` : ''}
          {linhas.length} componentes · {creditos} créditos
        </span>
        {semestre.marco && <Etiqueta texto={semestre.marco} cor="#7c3aed" />}
        {semestre.estagio && <Etiqueta texto={semestre.estagio} cor="#0d9488" />}
        <span style={{flex: 1}} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            border: `1px solid ${folga.ok ? '#16a34a' : '#dc2626'}`,
            color: folga.ok ? '#16a34a' : '#dc2626',
            whiteSpace: 'nowrap',
          }}
          title={`${faixas} de ${MAXIMO_FAIXAS} faixas da semana`}>
          {faixas} faixas · {folga.texto}
        </span>
      </div>

      {semestre.nota && (
        <div style={{padding: '10px 16px 0', fontSize: '13px', color: CINZA}}>{semestre.nota}</div>
      )}

      <table style={{margin: 0, width: '100%', fontSize: '14px'}}>
        <thead>
          <tr>
            <th style={{width: '110px'}}>Código</th>
            <th>Componente</th>
            <th style={{width: '55px', textAlign: 'center'}}>Cr.</th>
            <th style={{width: '65px', textAlign: 'center'}}>Faixas</th>
            <th style={{width: '60px', textAlign: 'center'}}>Série</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave}>
              <td>
                <code>{l.codigo}</code>
              </td>
              <td>
                {l.slug ? <Link to={`/${l.slug}`}>{l.nome}</Link> : l.nome}
                {l.etiqueta && <Etiqueta texto={l.etiqueta} cor="#0d9488" />}
                {l.status && l.status !== 'pendente' && (
                  <Etiqueta texto={ROTULO_STATUS[l.status] ?? l.status} cor={COR_STATUS[l.status] ?? CINZA} />
                )}
              </td>
              <td style={{textAlign: 'center'}}>{l.creditos}</td>
              <td style={{textAlign: 'center', fontWeight: l.faixas === 0 ? 400 : 600}}>
                {l.faixas}
              </td>
              <td style={{textAlign: 'center'}}>{l.serie}ª</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Etiqueta({texto, cor}: {texto: string; cor: string}) {
  return (
    <span
      style={{
        marginLeft: '6px',
        fontSize: '11px',
        color: cor,
        border: `1px solid ${cor}`,
        borderRadius: '10px',
        padding: '1px 5px',
        whiteSpace: 'nowrap',
      }}>
      {texto}
    </span>
  );
}

function Indicador({
  rotulo,
  valor,
  sub,
  cor,
}: {
  rotulo: string;
  valor: string;
  sub: string;
  cor: string;
}) {
  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderTop: `4px solid ${cor}`,
      }}>
      <div style={{fontSize: '12px', color: CINZA}}>{rotulo}</div>
      <div style={{fontSize: '22px', fontWeight: 'bold', color: cor}}>{valor}</div>
      <div style={{fontSize: '12px', color: 'var(--ifm-color-emphasis-600)'}}>{sub}</div>
    </div>
  );
}

