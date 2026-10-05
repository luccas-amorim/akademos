import type { DadosLocais } from '@akademos/core';
import {
  aplicarModelo,
  montarRevisao,
  type LinhaRevisao,
  type ModeloHistorico,
} from '@akademos/importers';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { entradaDaMatriz } from '../../dados/catalogo';
import { lerPdf } from '../../dados/pdf';
import s from './importar.module.css';
import { RevisaoHistorico } from './RevisaoHistorico';

type Estado =
  | { fase: 'escolher' }
  | { fase: 'lendo'; arquivo: string }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'revisar'; arquivo: string; linhas: LinhaRevisao[]; naoReconhecidas: string[] };

export function ImportarPdf({ dados, aoConcluir }: { dados: DadosLocais; aoConcluir: () => void }) {
  const { t } = useLingui();
  const [estado, setEstado] = useState<Estado>({ fase: 'escolher' });
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

  return (
    <RevisaoHistorico
      origem={
        <>
          <span className="ak-mono" style={{ fontSize: 13 }}>
            {estado.arquivo}
          </span>{' '}
          <span className="ak-small ak-muted">
            <Trans>· lido no aparelho, não enviado</Trans>
          </span>
        </>
      }
      linhas={estado.linhas}
      naoReconhecidas={estado.naoReconhecidas}
      dados={dados}
      rotuloVoltar={<Trans>Outro arquivo</Trans>}
      aoVoltar={() => setEstado({ fase: 'escolher' })}
      aoConcluir={aoConcluir}
    />
  );
}
