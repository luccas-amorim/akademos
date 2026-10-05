import type { DadosLocais } from '@akademos/core';
import {
  aplicarModelo,
  cursadasDaRevisao,
  decisaoPadrao,
  montarRevisao,
  type Decisao,
  type LinhaRevisao,
  type ModeloHistorico,
} from '@akademos/importers';
import { Button } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import { importarCursadas } from '../../dados/acoes';
import { entradaDaMatriz } from '../../dados/catalogo';
import { useFormatoNota } from '../../dados/formato';
import { lerPdf } from '../../dados/pdf';
import s from './importar.module.css';

type Estado =
  | { fase: 'escolher' }
  | { fase: 'lendo'; arquivo: string }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'revisar'; arquivo: string; linhas: LinhaRevisao[]; naoReconhecidas: string[] };

export function ImportarPdf({ dados, aoConcluir }: { dados: DadosLocais; aoConcluir: () => void }) {
  const { t } = useLingui();
  const fmt = useFormatoNota();
  const [estado, setEstado] = useState<Estado>({ fase: 'escolher' });
  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({});
  const [salvando, setSalvando] = useState(false);
  const primeiraRevisao = useRef<HTMLTableRowElement>(null);
  const modelo = entradaDaMatriz(dados.matriz.id)?.modeloHistorico as ModeloHistorico | null;

  const ler = async (arquivo: File) => {
    if (!modelo) {
      setEstado({
        fase: 'erro',
        mensagem: t`Ainda não há modelo de leitura de histórico para ${dados.instituicao.sigla}. Use a entrada manual ou contribua com um modelo no registro.`,
      });
      return;
    }
    setEstado({ fase: 'lendo', arquivo: arquivo.name });
    try {
      const r = await lerPdf(arquivo);
      if (r.semTexto) {
        setEstado({
          fase: 'erro',
          mensagem: t`Este PDF é uma imagem digitalizada, sem texto. Baixe o histórico direto do sistema da universidade (PDF com texto) ou use a entrada manual.`,
        });
        return;
      }
      const { cursadas, naoReconhecidas } = aplicarModelo(r.linhas, modelo);
      if (!cursadas.length) {
        setEstado({
          fase: 'erro',
          mensagem: t`Não reconhecemos nenhuma disciplina neste PDF. Confira se é o histórico do ${modelo.sistema.toUpperCase()} da ${dados.instituicao.sigla}.`,
        });
        return;
      }
      setDecisoes({});
      setEstado({
        fase: 'revisar',
        arquivo: arquivo.name,
        linhas: montarRevisao(cursadas, dados.matriz),
        naoReconhecidas,
      });
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e instanceof Error ? e.message : String(e) });
    }
  };

  if (estado.fase !== 'revisar') {
    return (
      <section className={s.painel}>
        <div style={{ fontWeight: 600 }}>
          <Trans>PDF do histórico</Trans>
        </div>
        <div className="ak-small" style={{ color: 'var(--ink-body)' }}>
          <Trans>
            Baixe o histórico escolar no sistema da sua universidade e escolha o arquivo. A leitura
            acontece neste aparelho; o PDF não é enviado.
          </Trans>
        </div>
        <label className={s.arquivo}>
          <span className="ak-small" style={{ fontWeight: 500 }}>
            <Trans>Arquivo PDF</Trans>
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={estado.fase === 'lendo'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
            }}
          />
        </label>
        {estado.fase === 'lendo' && (
          <div className="ak-small ak-muted" role="status">
            <Trans>Lendo {estado.arquivo}…</Trans>
          </div>
        )}
        {estado.fase === 'erro' && (
          <div className={s.erro} role="alert">
            {estado.mensagem}
          </div>
        )}
      </section>
    );
  }

  const { linhas } = estado;
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
        <div>
          <span className="ak-mono" style={{ fontSize: 13 }}>
            {estado.arquivo}
          </span>{' '}
          <span className="ak-small ak-muted">
            <Trans>· lido no aparelho, não enviado</Trans>
          </span>
        </div>
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
      {estado.naoReconhecidas.length > 0 && (
        <div className="ak-small" style={{ padding: '10px 16px', color: 'var(--amber-ink)' }}>
          <Trans>
            {estado.naoReconhecidas.length} linha(s) pareciam disciplinas mas não seguiram o formato
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
        <Button variant="subtle" onPress={() => setEstado({ fase: 'escolher' })}>
          <Trans>Outro arquivo</Trans>
        </Button>
        <Button onPress={() => void concluir()} isDisabled={salvando}>
          <Trans>Continuar</Trans>
        </Button>
      </div>
    </section>
  );
}
