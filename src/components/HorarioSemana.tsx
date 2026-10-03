import React from 'react';
import Link from '@docusaurus/Link';
import horario from '@site/src/data/horario.json';
import {MAXIMO_FAIXAS, config, diasLivres, disciplinas, meta} from '@site/src/lib/grade';

/**
 * Grade da semana para um semestre letivo, montada a partir de
 * src/data/horario.json cruzado com src/data/curriculo.json. Dias e faixas vêm
 * dos dados; os dias livres são calculados, não declarados.
 */

type Aula = {
  codigo: string;
  dia: string;
  faixas: number[];
  docente?: string;
  sala?: string;
  modalidade?: string;
};

type SemestreDoHorario = {observacao?: string; aulas: Aula[]};

export default function HorarioSemana({
  semestre = meta.semestreAtual,
}: {
  semestre?: string;
}): React.ReactElement {
  const dados = (horario.semestres as Record<string, SemestreDoHorario>)[semestre];
  if (!dados) {
    return <p>Sem horário registrado para {semestre}.</p>;
  }

  const aulas = dados.aulas;
  const faixas = horario.faixas as Record<string, string>;
  const numerosDasFaixas = Object.keys(faixas)
    .map(Number)
    .sort((a, b) => a - b);
  const porCodigo = new Map(disciplinas.map((d) => [d.codigo, d]));

  const celula = (dia: string, faixa: number) =>
    aulas.find((a) => a.dia === dia && a.faixas.includes(faixa));

  const creditos = aulas.reduce((acc, a) => acc + (porCodigo.get(a.codigo)?.creditos ?? 0), 0);
  const faixasOcupadas = aulas.reduce((acc, a) => acc + a.faixas.length, 0);
  const livres = config.dias.filter((dia) => !aulas.some((a) => a.dia === dia));
  const abreviar = (dia: string) => dia.replace('-feira', '');

  return (
    <div>
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', fontSize: '13px', margin: '0 0 8px'}}>
          <thead>
            <tr>
              <th style={{width: '110px'}}>Faixa</th>
              {config.dias.map((d) => (
                <th key={d} style={{textAlign: 'center'}}>
                  {abreviar(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numerosDasFaixas.map((faixa) => (
              <tr key={faixa}>
                <td style={{whiteSpace: 'nowrap', fontWeight: 600}}>{faixas[String(faixa)]}</td>
                {config.dias.map((dia) => {
                  const a = celula(dia, faixa);
                  const d = a ? porCodigo.get(a.codigo) : undefined;
                  return (
                    <td
                      key={dia}
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        background: a ? 'transparent' : 'var(--ifm-color-emphasis-100)',
                      }}>
                      {a && d ? (
                        <>
                          {d.slug ? (
                            <Link to={`/${d.slug}`} style={{fontWeight: 600}}>
                              {d.nome}
                            </Link>
                          ) : (
                            <strong>{d.nome}</strong>
                          )}
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--ifm-color-emphasis-700)',
                              marginTop: '2px',
                            }}>
                            <code>{a.codigo}</code>
                            {a.sala && <> · sala {a.sala}</>}
                            {a.docente && <> · {a.docente}</>}
                          </div>
                        </>
                      ) : (
                        <span style={{color: 'var(--ifm-color-emphasis-600)', fontSize: '12px'}}>
                          livre
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{fontSize: '13px', color: 'var(--ifm-color-emphasis-700)', margin: 0}}>
        {aulas.length} disciplinas · {creditos} créditos · {faixasOcupadas} de {MAXIMO_FAIXAS}{' '}
        faixas ·{' '}
        {livres.length > 0 ? (
          <strong>
            {diasLivres(livres.length)}: {livres.map(abreviar).join(', ')}
          </strong>
        ) : (
          <strong style={{color: '#dc2626'}}>
            semana cheia, sem {config.rotuloDia.singular} livre
          </strong>
        )}
      </p>
      {dados.observacao && (
        <p style={{fontSize: '13px', color: 'var(--ifm-color-emphasis-700)', margin: '4px 0 0'}}>
          {dados.observacao}
        </p>
      )}
    </div>
  );
}
