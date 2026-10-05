import { Trans, useLingui } from '@lingui/react/macro';
import { LogoMark } from '@akademos/ui';
import { Link, Outlet } from '@tanstack/react-router';
import s from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  badge?: string;
}

export function AppShell() {
  const { t } = useLingui();
  const nav: NavItem[] = [
    { to: '/', label: t`Início` },
    { to: '/percurso', label: t`Percurso` },
    { to: '/planejar', label: t`Planejar` },
    { to: '/insights', label: t`Insights` },
    { to: '/desempenho', label: t`Desempenho` },
    { to: '/carreira', label: t`Carreira` },
  ];

  return (
    <div className={s.shell}>
      <a className={s.skip} href="#conteudo">
        <Trans>Pular para o conteúdo</Trans>
      </a>
      <aside className={s.sidebar} aria-label={t`Navegação principal`}>
        <Link to="/" className={s.brand}>
          <LogoMark size={28} />
          <span className={s.brandName}>Akademos</span>
        </Link>
        <nav className={s.nav}>
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={s.navItem}
              activeOptions={{ exact: n.to === '/' }}
            >
              <span>{n.label}</span>
              {n.badge && <span className={s.badge}>{n.badge}</span>}
            </Link>
          ))}
        </nav>
        <div className={s.footer}>
          <div className={s.links}>
            <Link to="/importar" className={s.link}>
              <Trans>Importar</Trans>
            </Link>
            <Link to="/sobre" className={s.link}>
              <Trans>Sobre e apoio</Trans>
            </Link>
          </div>
        </div>
      </aside>
      <main className={s.main} id="conteudo">
        <div className={s.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
