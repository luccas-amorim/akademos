import { deslocarSemestre, ordinalDoSemestre, semestreDaData } from '@akademos/core';
import { LogoMark } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAnalise } from '../dados/analise';
import { gravarPreferencia, useOcultarNotas, useSessao } from '../dados/preferencias';
import { store, useEstadoDados } from '../dados/store';
import { TelaDeEstado } from './TelaDeEstado';
import s from './AppShell.module.css';

import { ROTAS_PUBLICAS } from './rotasPublicas';

export function AppShell() {
  const { t } = useLingui();
  const estado = useEstadoDados();
  const sessao = useSessao();
  const { pathname } = useLocation();
  const publica = ROTAS_PUBLICAS.has(pathname);
  const navigate = useNavigate();

  const semDados = estado.fase === 'pronto' && estado.dados === null;
  const precisaImportar = semDados && !publica && pathname !== '/importar';

  useEffect(() => {
    void store.iniciar();
  }, []);

  // Sem dados ainda: o primeiro passo é escolher o curso e trazer o histórico.
  useEffect(() => {
    if (precisaImportar) void navigate({ to: '/importar', replace: true });
  }, [precisaImportar, navigate]);

  if (estado.fase === 'abrindo') {
    return <TelaDeEstado titulo={t`Abrindo seus dados…`} />;
  }
  if (estado.fase === 'erro') {
    return (
      <TelaDeEstado
        titulo={
          estado.outraAba
            ? t`O Akademos está aberto em outra aba`
            : t`Não foi possível abrir os dados locais`
        }
        texto={
          estado.outraAba
            ? t`Feche a outra aba e recarregue esta página. Os dados ficam num só arquivo neste navegador.`
            : estado.mensagem
        }
      />
    );
  }
  if (precisaImportar) return <TelaDeEstado titulo={t`Abrindo seus dados…`} />;

  return (
    <div className={s.shell}>
      <a className={s.skip} href="#conteudo">
        <Trans>Pular para o conteúdo</Trans>
      </a>
      {sessao ? <BarraLateral /> : <BarraPublica />}
      <main className={s.main} id="conteudo">
        <div className={s.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function BarraPublica() {
  const { t } = useLingui();
  return (
    <aside className={s.sidebar} aria-label={t`Navegação`}>
      <Link to="/sobre" className={s.brand}>
        <LogoMark size={28} />
        <span className={s.brandName}>Akademos</span>
      </Link>
      <nav className={s.nav}>
        <Link to="/entrar" className={s.navItem}>
          <Trans>Entrar</Trans>
        </Link>
        <Link to="/sobre" className={s.navItem}>
          <Trans>Sobre e apoio</Trans>
        </Link>
      </nav>
    </aside>
  );
}

function BarraLateral() {
  const { t } = useLingui();
  const estado = useEstadoDados();
  const navigate = useNavigate();
  const [ocultar, setOcultar] = useOcultarNotas();
  const dados = estado.fase === 'pronto' ? estado.dados : null;

  const atual = semestreDaData(new Date());
  const proximo = deslocarSemestre(atual, 1);

  const sair = () => {
    // Sair não apaga dados locais (docs/DESIGN.md › Interações).
    gravarPreferencia('sessao', null);
    void navigate({ to: '/entrar' });
  };

  return (
    <aside className={s.sidebar} aria-label={t`Navegação principal`}>
      <Link to="/" className={s.brand}>
        <LogoMark size={28} />
        <span className={s.brandName}>Akademos</span>
      </Link>
      {dados && (
        <div className={s.profile}>
          <div className={s.profileName}>{dados.aluno.nome}</div>
          <div className={s.profileLine}>
            {dados.curso.nome} · {dados.instituicao.sigla}
          </div>
          <div className={s.profileLine}>
            <Trans>
              {ordinalDoSemestre(dados.aluno.ingresso, atual)}º semestre · {atual}
            </Trans>
          </div>
        </div>
      )}
      {dados && <Navegacao proximo={proximo} />}
      <div className={s.footer}>
        <Link to="/dados" className={s.dataBox}>
          <div className={s.dataBoxTitle}>
            <Trans>Dados neste aparelho</Trans>
          </div>
          <div>
            {estado.fase === 'pronto' && estado.armazenamento === 'memoria' ? (
              <Trans>Armazenamento indisponível: nada será guardado</Trans>
            ) : (
              <Trans>Sem conta · nada sai daqui</Trans>
            )}
          </div>
        </Link>
        <button
          type="button"
          className={s.privacy}
          onClick={() => setOcultar(!ocultar)}
          aria-pressed={ocultar}
        >
          {ocultar ? <Trans>Mostrar notas</Trans> : <Trans>Ocultar notas</Trans>}
        </button>
        <div className={s.links}>
          <Link to="/importar" className={s.link}>
            <Trans>Importar</Trans>
          </Link>
          <button type="button" className={s.link} onClick={sair}>
            <Trans>Sair</Trans>
          </button>
          <Link to="/sobre" className={s.link}>
            <Trans>Sobre e apoio</Trans>
          </Link>
        </div>
      </div>
    </aside>
  );
}

/** Itens da navegação com os selos do protótipo: "!" no Planejar e o total de insights. */
function Navegacao({ proximo }: { proximo: string }) {
  const { t } = useLingui();
  const { insights } = useAnalise();
  const urgentePlanejar = insights.some(
    (i) => i.severidade === 'alta' && i.acao?.destino === 'planejar',
  );
  const nav = [
    { to: '/', label: t`Início`, selo: '' },
    { to: '/percurso', label: t`Percurso`, selo: '' },
    { to: '/planejar', label: t`Planejar ${proximo}`, selo: urgentePlanejar ? '!' : '' },
    { to: '/insights', label: t`Insights`, selo: insights.length ? String(insights.length) : '' },
    { to: '/desempenho', label: t`Desempenho`, selo: '' },
    { to: '/carreira', label: t`Carreira`, selo: '' },
  ] as const;
  return (
    <nav className={s.nav}>
      {nav.map((n) => (
        <Link key={n.to} to={n.to} className={s.navItem} activeOptions={{ exact: n.to === '/' }}>
          <span>{n.label}</span>
          {n.selo && (
            <span
              className={s.badge}
              aria-label={n.selo === '!' ? t`requer atenção` : t`${n.selo} insights`}
            >
              {n.selo}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
