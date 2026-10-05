import { deslocarSemestre, ordinalDoSemestre, semestreDaData } from '@akademos/core';
import { LogoMark } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, Navigate, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { gravarPreferencia, useOcultarNotas, useSessao } from '../dados/preferencias';
import { store, useEstadoDados } from '../dados/store';
import { TelaDeEstado } from './TelaDeEstado';
import s from './AppShell.module.css';

/** Telas acessíveis sem sessão e sem dados. */
const PUBLICAS = new Set(['/sobre']);

export function AppShell() {
  const { t } = useLingui();
  const estado = useEstadoDados();
  const sessao = useSessao();
  const { pathname } = useLocation();
  const publica = PUBLICAS.has(pathname);

  useEffect(() => {
    void store.iniciar();
  }, []);

  if (!sessao && !publica) return <Navigate to="/entrar" replace />;
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
  const temDados = estado.dados !== null;
  if (!temDados && !publica && pathname !== '/importar') {
    return <Navigate to="/importar" replace />;
  }

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
  const nav = [
    { to: '/', label: t`Início` },
    { to: '/percurso', label: t`Percurso` },
    { to: '/planejar', label: t`Planejar ${proximo}` },
    { to: '/insights', label: t`Insights` },
    { to: '/desempenho', label: t`Desempenho` },
    { to: '/carreira', label: t`Carreira` },
  ] as const;

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
      {dados && (
        <nav className={s.nav}>
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={s.navItem}
              activeOptions={{ exact: n.to === '/' }}
            >
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      )}
      <div className={s.footer}>
        <div className={s.dataBox}>
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
        </div>
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
