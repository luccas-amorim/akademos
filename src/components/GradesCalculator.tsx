import React from 'react';
import notasData from '@site/src/data/notas.json';
import {type Disciplina, ROTULO_STATUS, disciplinas, meta} from '@site/src/lib/grade';

/**
 * Notas por código de disciplina. A identidade das disciplinas (nome, créditos,
 * série) vem de curriculo.json; notas.json guarda apenas o valor da nota e a
 * regra de aprovação do curso.
 */

type RegraDeNotas = {
  escala: number;
  aprovacao: number;
  /** Abaixo da aprovação e a partir daqui: recuperação (opcional). */
  recuperacao?: number;
  /** A partir daqui: excelente (opcional; padrão 90% da escala). */
  excelencia?: number;
};

const regra = notasData.config as RegraDeNotas;
const excelencia = regra.excelencia ?? regra.escala * 0.9;
const notas = notasData.notas as Record<string, number | null>;

const notaDe = (codigo: string): number | null => notas[codigo] ?? null;

function media(ds: Disciplina[]): number | null {
  const comNota = ds.filter((d) => notaDe(d.codigo) !== null);
  if (comNota.length === 0) return null;
  const num = comNota.reduce((a, d) => a + (notaDe(d.codigo) as number) * d.creditos, 0);
  const den = comNota.reduce((a, d) => a + d.creditos, 0);
  return num / den;
}

function faixaDaNota(nota: number): {cor: string; rotulo: string} {
  if (nota >= excelencia) return {cor: '#15803d', rotulo: 'Excelente'};
  if (nota >= regra.aprovacao) return {cor: '#1d4ed8', rotulo: 'Aprovado'};
  if (regra.recuperacao !== undefined && nota >= regra.recuperacao) {
    return {cor: '#d97706', rotulo: 'Recuperação'};
  }
  return {cor: '#dc2626', rotulo: 'Reprovado'};
}

const corDaNota = (nota: number) => faixaDaNota(nota).cor;
const rotuloDaNota = (nota: number) => faixaDaNota(nota).rotulo;

export default function GradesCalculator(): React.ReactElement {
  const geral = media(disciplinas);
  const comNota = disciplinas.filter((d) => notaDe(d.codigo) !== null);
  const crComNota = comNota.reduce((a, d) => a + d.creditos, 0);

  const series = [...new Set(disciplinas.map((d) => d.serie))].sort((a, b) => a - b);

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
        <SummaryCard
          title="Média geral ponderada"
          value={geral !== null ? geral.toFixed(2) : '—'}
          subtitle={`${crComNota} / ${meta.creditosExigidos} créditos computados`}
          color="#3b82f6"
        />
        <SummaryCard
          title="Disciplinas com nota"
          value={`${comNota.length} / ${disciplinas.length}`}
          subtitle="notas lançadas"
          color="#8b5cf6"
        />
        <SummaryCard
          title="Escala"
          value={`0 – ${regra.escala}`}
          subtitle={`aprovação ≥ ${regra.aprovacao}`}
          color="#059669"
        />
        <SummaryCard
          title="Fórmula"
          value="MP"
          subtitle="Σ(nota × cr) / Σ(cr)"
          color="#d97706"
        />
      </div>

      {series.map((serie) => {
        const daSerie = disciplinas
          .filter((d) => d.serie === serie)
          .sort((a, b) => a.codigo.localeCompare(b.codigo));
        const mediaSerie = media(daSerie);

        return (
          <div key={serie} style={{marginBottom: '28px'}}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '8px',
              }}>
              <h3 style={{margin: 0}}>{serie}ª série</h3>
              {mediaSerie !== null && (
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: corDaNota(mediaSerie),
                  }}>
                  Média: {mediaSerie.toFixed(2)}
                </span>
              )}
            </div>

            <table style={{width: '100%', fontSize: '14px', margin: 0}}>
              <thead>
                <tr>
                  <th style={{textAlign: 'left', width: '110px'}}>Código</th>
                  <th style={{textAlign: 'left'}}>Disciplina</th>
                  <th style={{textAlign: 'center', width: '70px'}}>Créd.</th>
                  <th style={{textAlign: 'center', width: '80px'}}>Nota</th>
                  <th style={{textAlign: 'center', width: '120px'}}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {daSerie.map((d) => {
                  const nota = notaDe(d.codigo);
                  return (
                    <tr key={d.codigo}>
                      <td>
                        <code>{d.codigo}</code>
                      </td>
                      <td>{d.nome}</td>
                      <td style={{textAlign: 'center'}}>{d.creditos}</td>
                      <td style={{textAlign: 'center'}}>
                        {nota !== null ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontWeight: 'bold',
                              color: '#fff',
                              background: corDaNota(nota),
                              minWidth: '40px',
                            }}>
                            {nota.toFixed(1)}
                          </span>
                        ) : (
                          <span style={{color: 'var(--ifm-color-emphasis-500)'}}>—</span>
                        )}
                      </td>
                      <td style={{textAlign: 'center', fontSize: '12px'}}>
                        {nota !== null ? (
                          <span style={{color: corDaNota(nota)}}>{rotuloDaNota(nota)}</span>
                        ) : (
                          <span style={{color: 'var(--ifm-color-emphasis-600)'}}>
                            {ROTULO_STATUS[d.status] ?? d.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          borderLeft: '4px solid var(--ifm-color-primary)',
          background: 'var(--ifm-color-emphasis-100)',
          marginTop: '24px',
          fontSize: '14px',
        }}>
        <strong>Como a média é calculada</strong>
        <p style={{margin: '8px 0 0'}}>
          <strong>Média Ponderada = Σ(nota × créditos) / Σ(créditos)</strong>
        </p>
        <p style={{margin: '4px 0 0', color: 'var(--ifm-color-emphasis-700)'}}>
          Cada nota é multiplicada pelos créditos da disciplina: uma disciplina de 4 créditos
          pesa o dobro de uma de 2. Apenas disciplinas com nota lançada entram no cálculo.
        </p>
        <p style={{margin: '8px 0 0', color: 'var(--ifm-color-emphasis-700)'}}>
          Para lançar uma nota, edite <code>src/data/notas.json</code> — a chave é o código
          da disciplina em <code>curriculo.json</code>.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}): React.ReactElement {
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
