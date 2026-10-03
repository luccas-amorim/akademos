import React from 'react';
import {eletivas} from '@site/src/lib/grade';

/**
 * Bloco auxiliar da página de Planejamento de Integralização, gerado de
 * src/data/curriculo.json para não haver segunda cópia dos mesmos fatos.
 */

const CINZA = 'var(--ifm-color-emphasis-700)';

/** As eletivas escolhidas. O semestre de cada uma depende da oferta. */
export function EletivasEscolhidas(): React.ReactElement {
  if (eletivas.escolhas.length === 0) {
    return <p style={{color: CINZA}}>Nenhuma eletiva escolhida ainda.</p>;
  }
  return (
    <div>
      <table style={{width: '100%'}}>
        <thead>
          <tr>
            <th style={{width: '38%'}}>Eletiva</th>
            <th>Por quê</th>
          </tr>
        </thead>
        <tbody>
          {eletivas.escolhas.map((e) => (
            <tr key={e.nome}>
              <td>
                <strong>{e.nome}</strong>
              </td>
              <td>{e.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {eletivas.notaDasEscolhas && (
        <p style={{fontSize: '13px', color: CINZA, marginTop: '8px'}}>
          {eletivas.notaDasEscolhas}
        </p>
      )}
    </div>
  );
}
