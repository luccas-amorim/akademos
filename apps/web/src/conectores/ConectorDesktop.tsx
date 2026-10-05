import { deslocarSemestre, semestreDaData, type DadosLocais, type Oferta } from '@akademos/core';
import {
  clienteHttpDeFetch,
  corresponder,
  criarConectorSigaa,
  ErroConector,
  extrairLinhas,
  montarRevisao,
  type Connector,
  type LinhaRevisao,
  type ModeloHistorico,
  type PdfJsMinimo,
  type Sessao,
} from '@akademos/importers';
import { Button, Checkbox, Note, TextField } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { importarOfertas } from '../dados/acoes';
import { entradaDaMatriz } from '../dados/catalogo';
import { RevisaoHistorico } from '../routes/importar/RevisaoHistorico';
import { apagarSegredo, guardarSegredo, lerSegredo } from './chaveiro';

async function lerPdfDesktop(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return (await extrairLinhas(pdfjs as unknown as PdfJsMinimo, bytes)).linhas;
}

async function criarConector(dados: DadosLocais): Promise<Connector> {
  const entrada = entradaDaMatriz(dados.matriz.id);
  if (!entrada?.conector || !entrada.modeloHistorico) {
    throw new ErroConector('nao-suportado', 'Esta instituição ainda não tem conector configurado.');
  }
  if (entrada.conector.sistema !== 'sigaa') {
    throw new ErroConector(
      'nao-suportado',
      'Conector desta instituição ainda não disponível no app.',
    );
  }
  // fetch do Tauri: sai do aparelho, sem CORS e sem passar por servidor nosso.
  const { fetch } = await import('@tauri-apps/plugin-http');
  return criarConectorSigaa({
    base: entrada.conector.base,
    instituicoes: [dados.instituicao.id],
    http: clienteHttpDeFetch(fetch as typeof globalThis.fetch),
    modelo: entrada.modeloHistorico as ModeloHistorico,
    departamentos: entrada.conector.departamentos,
    lerPdf: lerPdfDesktop,
  });
}

const CHAVE_CREDENCIAL = (inst: string) => `credencial:${inst}`;

/** Conector no desktop: credencial só no aparelho; nada passa pelo servidor do Akademos. */
export default function ConectorDesktop({
  dados,
  aoConcluir,
}: {
  dados: DadosLocais;
  aoConcluir: () => void;
}) {
  const { t } = useLingui();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [sessao, setSessao] = useState<{ conector: Connector; sessao: Sessao } | null>(null);
  const [revisao, setRevisao] = useState<LinhaRevisao[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'danger' | 'positive'; texto: string } | null>(null);
  const proximo = deslocarSemestre(semestreDaData(new Date()), 1);

  const executar = async (rotulo: string, fn: () => Promise<void>) => {
    setAviso(null);
    setOcupado(rotulo);
    try {
      await fn();
    } catch (e) {
      setAviso({ tom: 'danger', texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado(null);
    }
  };

  const entrar = (e: FormEvent) => {
    e.preventDefault();
    void executar(t`Entrando…`, async () => {
      const conector = await criarConector(dados);
      const cred =
        usuario && senha
          ? { usuario, senha }
          : JSON.parse((await lerSegredo(CHAVE_CREDENCIAL(dados.instituicao.id))) ?? 'null');
      if (!cred) throw new Error(t`Informe usuário e senha.`);
      const s = await conector.login(cred);
      if (lembrar)
        await guardarSegredo(CHAVE_CREDENCIAL(dados.instituicao.id), JSON.stringify(cred));
      setSenha('');
      setSessao({ conector, sessao: s });
    });
  };

  const lerHistorico = () =>
    void executar(t`Lendo o histórico…`, async () => {
      const brutas = await sessao!.conector.historico(sessao!.sessao);
      setRevisao(montarRevisao(brutas, dados.matriz));
    });

  const lerOferta = () =>
    void executar(t`Lendo a oferta de ${proximo}…`, async () => {
      const brutas = (await sessao!.conector.oferta?.(sessao!.sessao, proximo)) ?? [];
      const agora = new Date().toISOString();
      const ofertas: Oferta[] = brutas.flatMap((b) => {
        const d = corresponder(
          { codigo: b.disciplinaCodigo, nome: b.titulo ?? '' },
          dados.matriz,
        ).disciplina;
        const codigo =
          d?.codigo ??
          (b.titulo
            ? dados.matriz.disciplinas.find((x) => x.tipo === 'eletiva')?.codigo
            : undefined);
        if (!codigo) return [];
        return [
          {
            ...b,
            disciplinaCodigo: codigo,
            id: `${proximo.replace('/', '-')}-${codigo}-${b.turma}`,
            atualizadaEm: agora,
          },
        ];
      });
      await importarOfertas(ofertas);
      setAviso({ tom: 'positive', texto: t`${ofertas.length} turmas de ${proximo} atualizadas.` });
    });

  if (revisao) {
    return (
      <RevisaoHistorico
        origem={<Trans>Histórico lido do {dados.instituicao.sigla} neste aparelho</Trans>}
        linhas={revisao}
        naoReconhecidas={[]}
        dados={dados}
        rotuloVoltar={<Trans>Voltar ao conector</Trans>}
        aoVoltar={() => setRevisao(null)}
        aoConcluir={aoConcluir}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!sessao ? (
        <form
          onSubmit={entrar}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}
        >
          <TextField
            label={t`Usuário do sistema`}
            value={usuario}
            onChange={setUsuario}
            autoComplete="username"
          />
          <TextField
            label={t`Senha`}
            type="password"
            value={senha}
            onChange={setSenha}
            autoComplete="current-password"
          />
          <Checkbox isSelected={lembrar} onChange={setLembrar}>
            <Trans>Guardar no chaveiro do sistema deste computador</Trans>
          </Checkbox>
          <Button type="submit" isDisabled={!!ocupado} style={{ alignSelf: 'flex-start' }}>
            {ocupado ?? <Trans>Entrar pelo {dados.instituicao.sistema.toUpperCase()}</Trans>}
          </Button>
          <Button
            variant="link"
            onPress={() => void apagarSegredo(CHAVE_CREDENCIAL(dados.instituicao.id))}
          >
            <Trans>Esquecer credencial guardada</Trans>
          </Button>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onPress={lerHistorico} isDisabled={!!ocupado}>
            <Trans>Ler histórico</Trans>
          </Button>
          <Button variant="outline" onPress={lerOferta} isDisabled={!!ocupado}>
            <Trans>Atualizar oferta de {proximo}</Trans>
          </Button>
          {ocupado && <span className="ak-small ak-muted">{ocupado}</span>}
        </div>
      )}
      {aviso && <Note tone={aviso.tom}>{aviso.texto}</Note>}
    </div>
  );
}
