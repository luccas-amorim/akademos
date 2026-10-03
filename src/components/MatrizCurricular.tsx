import React from 'react';
import Link from '@docusaurus/Link';
import {
  COR_STATUS,
  ROTULO_STATUS,
  chDe,
  config,
  cursarEm,
  disciplinas,
  meta,
  vagasEletivas,
} from '@site/src/lib/grade';

/**
 * A matriz curricular, série a série, gerada de src/data/curriculo.json.
 * Uma página só, para que um curso com mais ou menos séries não exija criar
 * ou apagar arquivos em docs/ — basta editar os dados.
 */

const CINZA = 'var(--ifm-color-emphasis-700)';

export default function MatrizCurricular(): React.ReactElement {
  const series = Array.from({length: meta.series}, (_, i) => i + 1);

  return (
    <div>
      {series.map((serie) => {
        const daSerie = disciplinas
          .filter((d) => d.serie === serie)
          .sort((a, b) => a.codigo.localeCompare(b.codigo));
        const vagas = vagasEletivas.filter((e) => e.serie === serie);
        const ch =
          daSerie.reduce((a, d) => a + chDe(d), 0) +
          vagas.reduce((a, e) => a + e.creditos * config.horasPorCredito, 0);
        const cr =
          daSerie.reduce((a, d) => a + d.creditos, 0) + vagas.reduce((a, e) => a + e.creditos, 0);

        return (
          <section key={serie} style={{marginBottom: '32px'}}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
              }}>
              <h3 id={`serie-${serie}`} style={{margin: 0}}>
                {serie}ª série
              </h3>
              <span style={{fontSize: '13px', color: CINZA}}>
                {ch}h · {cr} créditos
              </span>
            </div>

            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', fontSize: '14px', margin: 0}}>
                <thead>
                  <tr>
                    <th style={{width: '100px'}}>Código</th>
                    <th>Disciplina</th>
                    <th style={{textAlign: 'center', width: '60px'}}>CH</th>
                    <th style={{textAlign: 'center', width: '55px'}}>Cr.</th>
                    <th>Área</th>
                    <th style={{textAlign: 'center'}}>Situação</th>
                    <th style={{textAlign: 'center'}}>Cursar em</th>
                  </tr>
                </thead>
                <tbody>
                  {daSerie.map((d) => (
                    <tr key={d.codigo}>
                      <td>
                        <code>{d.codigo}</code>
                      </td>
                      <td>{d.slug ? <Link to={`/${d.slug}`}>{d.nome}</Link> : d.nome}</td>
                      <td style={{textAlign: 'center'}}>{chDe(d)}h</td>
                      <td style={{textAlign: 'center'}}>{d.creditos}</td>
                      <td>{d.area}</td>
                      <td style={{textAlign: 'center', color: COR_STATUS[d.status] ?? CINZA}}>
                        {ROTULO_STATUS[d.status] ?? d.status}
                      </td>
                      <td style={{textAlign: 'center', whiteSpace: 'nowrap'}}>{cursarEm(d.plano)}</td>
                    </tr>
                  ))}
                  {vagas.map((e) => (
                    <tr key={e.rotulo}>
                      <td>
                        <code>—</code>
                      </td>
                      <td>
                        {e.rotulo} <span style={{color: CINZA, fontSize: '12px'}}>(eletiva)</span>
                      </td>
                      <td style={{textAlign: 'center'}}>{e.creditos * config.horasPorCredito}h</td>
                      <td style={{textAlign: 'center'}}>{e.creditos}</td>
                      <td>—</td>
                      <td style={{textAlign: 'center', color: CINZA}}>A cursar</td>
                      <td style={{textAlign: 'center', whiteSpace: 'nowrap'}}>{cursarEm(e.plano)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
