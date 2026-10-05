import type { DadosLocais } from '@akademos/core';
import {
  cursadasDaRevisao,
  decisaoPadrao,
  type Decisao,
  type LinhaRevisao,
} from '@akademos/importers';
import { Button } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRef, useState, type ReactNode } from 'react';
import { importarCursadas } from '../../dados/acoes';
import { useFormatoNota } from '../../dados/formato';
import s from './importar.module.css';

/**
 * Tela de revisão comum ao PDF e aos conectores: o que foi reconhecido, o que
 * pede confirmação e a correspondência com a matriz, antes de gravar.
 */
export function RevisaoHistorico({
  origem,
  linhas,
  naoReconhecidas,
  dados,
  rotuloVoltar,
  aoVoltar,
  aoConcluir,
}: {
  origem: ReactNode;
  linhas: LinhaRevisao[];
  naoReconhecidas: string[];
  dados: DadosLocais;
  rotuloVoltar: ReactNode;
  aoVoltar: () => void;
  aoConcluir: () => void;
}) {
  const { t } = useLingui();
  const fmt = useFormatoNota();
  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({});
  const [salvando, setSalvando] = useState(false);
  const primeiraRevisao = useRef<HTMLTableRowElement>(null);
  const reconhecidas = linhas.filter((l) => !l.revisar).length;
  const paraRevisar = linhas.filter((l) => l.revisar);
  const decisao = (l: LinhaRevisao) => decisoes[l.id] ?? decisaoPadrao(l);
  const eletivas = dados.matriz.disciplinas.filter((d) => d.tipo !== 'obrigatoria');

  const descreverCorrespondencia = (l: LinhaRevisao): string => {
    const d = l.correspondencia.disciplina;
    switch (l.revisar) {
      case 'sem-equivalente':
        return t`Sem equivalente: usar como eletiva?`;
      case 'tentativa-anterior':
        return t`${d?.codigo} · registrar reprovação anterior?`;
      case 'situacao-desconhecida':
        return t`Situação "${l.bruta.situacaoOriginal}" desconhecida`;
      case 'por-nome':
        return t`${d?.codigo} · ${d?.nome} (pelo nome)`;
      default:
        return `${d?.codigo} · ${d?.nome}`;
    }
  };

  const concluir = async () => {
    setSalvando(true);
    try {
      await importarCursadas(cursadasDaRevisao(linhas, decisoes, dados.aluno.id), dados.cursadas);
      aoConcluir();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className={s.painelSemPad}>
      <div className={s.barraArquivo}>
        <div>{origem}</div>
        <div className="ak-small">
          <strong style={{ color: 'var(--olive-ink)' }}>
            <Trans>{reconhecidas} reconhecidas</Trans>
          </strong>
          {paraRevisar.length > 0 && (
            <>
              {' · '}
              <strong style={{ color: 'var(--amber-ink)' }}>
                <Trans>{paraRevisar.length} para revisar</Trans>
              </strong>
            </>
          )}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className={s.revisao}>
          <thead>
            <tr>
              <th>
                <Trans>No PDF</Trans>
              </th>
              <th>
                <Trans>Disciplina</Trans>
              </th>
              <th>
                <Trans>Semestre</Trans>
              </th>
              <th>
                <Trans>Nota</Trans>
              </th>
              <th>
                <Trans>Correspondência na matriz</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const d = decisao(l);
              const primeira = l === paraRevisar[0];
              return (
                <tr
                  key={l.id}
                  className={l.revisar ? s.revisar : undefined}
                  ref={primeira ? primeiraRevisao : undefined}
                >
                  <td className="ak-mono" style={{ fontSize: 12 }}>
                    {l.bruta.codigo}
                  </td>
                  <td>{l.bruta.nome}</td>
                  <td className="ak-mono" style={{ fontSize: 12 }}>
                    {l.bruta.semestre}
                  </td>
                  <td>{fmt.nota(l.bruta.nota)}</td>
                  <td style={{ color: l.revisar ? 'var(--amber-ink)' : 'var(--olive-ink)' }}>
                    {descreverCorrespondencia(l)}
                    {l.revisar && (
                      <div style={{ marginTop: 6 }}>
                        <select
                          className="ak-select ak-select--sm"
                          aria-label={t`O que fazer com ${l.bruta.nome}`}
                          value={
                            d.acao === 'ignorar'
                              ? ''
                              : (d.disciplinaCodigo ?? l.correspondencia.disciplina?.codigo ?? '')
                          }
                          onChange={(e) =>
                            setDecisoes((x) => ({
                              ...x,
                              [l.id]: e.target.value
                                ? { acao: 'importar', disciplinaCodigo: e.target.value }
                                : { acao: 'ignorar' },
                            }))
                          }
                        >
                          <option value="">{t`Não importar`}</option>
                          {l.correspondencia.disciplina && (
                            <option value={l.correspondencia.disciplina.codigo}>
                              {t`Importar como ${l.correspondencia.disciplina.codigo} · ${l.correspondencia.disciplina.nome}`}
                            </option>
                          )}
                          {!l.correspondencia.disciplina &&
                            eletivas.map((e) => (
                              <option key={e.codigo} value={e.codigo}>
                                {t`Usar como ${e.codigo} · ${e.nome}`}
                              </option>
                            ))}
                          {!l.correspondencia.disciplina && l.correspondencia.sugestao && (
                            <option value={l.correspondencia.sugestao.codigo}>
                              {t`É ${l.correspondencia.sugestao.codigo} · ${l.correspondencia.sugestao.nome}`}
                            </option>
                          )}
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {naoReconhecidas.length > 0 && (
        <div className="ak-small" style={{ padding: '10px 16px', color: 'var(--amber-ink)' }}>
          <Trans>
            {naoReconhecidas.length} linha(s) pareciam disciplinas mas não seguiram o formato
            esperado; confira e lance à mão se faltar algo.
          </Trans>
        </div>
      )}
      <div className={s.acoes}>
        {paraRevisar.length > 0 && (
          <Button
            variant="subtle"
            onPress={() =>
              primeiraRevisao.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          >
            <Trans>Revisar {paraRevisar.length}</Trans>
          </Button>
        )}
        <Button variant="subtle" onPress={aoVoltar}>
          {rotuloVoltar}
        </Button>
        <Button onPress={() => void concluir()} isDisabled={salvando}>
          <Trans>Continuar</Trans>
        </Button>
      </div>
    </section>
  );
}
