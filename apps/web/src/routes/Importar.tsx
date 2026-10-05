import { PageHeader } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { carregarExemplo } from '../dados/acoes';
import { useEstadoDados } from '../dados/store';
import { ImportarManual } from './importar/ImportarManual';
import { ImportarPdf } from './importar/ImportarPdf';
import { PainelConector } from './importar/PainelConector';
import { PassoCurso } from './importar/PassoCurso';
import { PassoPrivacidade } from './importar/PassoPrivacidade';
import s from './importar/importar.module.css';

type Metodo = 'pdf' | 'conector' | 'manual';
type Passo = 1 | 2 | 3;

export function Importar() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const estado = useEstadoDados();
  const dados = estado.fase === 'pronto' ? estado.dados : null;
  const [passo, setPasso] = useState<Passo>(dados ? 2 : 1);
  const [trocandoCurso, setTrocandoCurso] = useState(false);
  const [metodo, setMetodo] = useState<Metodo>('pdf');

  const irParaInicio = () => void navigate({ to: '/' });
  const explorar = async () => {
    await carregarExemplo();
    irParaInicio();
  };

  if (passo === 1 || !dados || trocandoCurso) {
    return (
      <div className={s.pagina}>
        <PageHeader
          eyebrow={<Trans>Passo 1 de 3</Trans>}
          title={dados ? <Trans>Trocar de curso</Trans> : <Trans>Comece pelo seu curso</Trans>}
          subtitle={
            <Trans>
              Escolha a matriz. Depois você traz o histórico por PDF, conector ou à mão.
            </Trans>
          }
        />
        <PassoCurso
          aluno={dados?.aluno ?? null}
          aoConcluir={() => {
            setTrocandoCurso(false);
            setPasso(2);
          }}
          aoExplorar={() => void explorar()}
        />
      </div>
    );
  }

  const cabecalhoCurso = (
    <>
      {dados.instituicao.nome} · {dados.curso.nome} · <Trans>matriz {dados.matriz.ano}</Trans>{' '}
      <a
        href="#trocar"
        onClick={(e) => {
          e.preventDefault();
          setTrocandoCurso(true);
        }}
      >
        <Trans>trocar</Trans>
      </a>
    </>
  );

  if (passo === 3) {
    return (
      <div className={s.pagina}>
        <PageHeader
          eyebrow={<Trans>Passo 3 de 3</Trans>}
          title={<Trans>Seus dados, suas regras</Trans>}
          subtitle={cabecalhoCurso}
        />
        <PassoPrivacidade aoConcluir={irParaInicio} />
      </div>
    );
  }

  const metodos: Array<{ id: Metodo; titulo: string; texto: string }> = [
    {
      id: 'pdf',
      titulo: t`PDF do histórico`,
      texto: t`Leitura no aparelho. Reconhece códigos e notas e casa com a matriz.`,
    },
    {
      id: 'conector',
      titulo: t`Conectar ao sistema`,
      texto: t`Mantém histórico, oferta e lotação de turmas sempre atualizados.`,
    },
    {
      id: 'manual',
      titulo: t`Entrada manual`,
      texto: t`Marque o que já cursou numa matriz pronta da comunidade.`,
    },
  ];
  const avancar = () => setPasso(3);

  return (
    <div className={s.pagina}>
      <PageHeader
        eyebrow={<Trans>Passo 2 de 3</Trans>}
        title={<Trans>Traga seu histórico</Trans>}
        subtitle={cabecalhoCurso}
      />
      <div className={s.metodos} role="group" aria-label={t`Como importar`}>
        {metodos.map((m) => (
          <button
            key={m.id}
            type="button"
            className={s.metodo}
            aria-pressed={metodo === m.id}
            onClick={() => setMetodo(m.id)}
          >
            <span className={s.metodoTitulo}>{m.titulo}</span>
            <span className={s.metodoTexto}>{m.texto}</span>
          </button>
        ))}
      </div>
      {metodo === 'pdf' && <ImportarPdf dados={dados} aoConcluir={avancar} />}
      {metodo === 'conector' && <PainelConector dados={dados} aoConcluir={avancar} />}
      {metodo === 'manual' && <ImportarManual dados={dados} aoConcluir={avancar} />}
      <div className={s.aviso}>
        <Trans>
          Próximo passo: privacidade. Por padrão, tudo fica neste aparelho. Sincronizar entre
          aparelhos e compartilhar históricos anônimos com a comunidade são opcionais e você pode
          desligar quando quiser.
        </Trans>{' '}
        <a
          href="#privacidade"
          onClick={(e) => {
            e.preventDefault();
            avancar();
          }}
        >
          <Trans>Pular para privacidade</Trans>
        </a>
      </div>
    </div>
  );
}
