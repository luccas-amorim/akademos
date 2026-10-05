import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
} from '@tanstack/react-router';
import { AppShell } from './layout/AppShell';
import { NotFound } from './routes/NotFound';

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});

/** Rotas com a barra lateral. Cada tela é carregada sob demanda. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
});

const filha = <const P extends string>(path: P, component: ReturnType<typeof lazyRouteComponent>) =>
  createRoute({ getParentRoute: () => appRoute, path, component });

const inicio = filha(
  '/',
  lazyRouteComponent(() => import('./routes/Inicio'), 'Inicio'),
);
const percurso = filha(
  '/percurso',
  lazyRouteComponent(() => import('./routes/Percurso'), 'Percurso'),
);
const planejar = filha(
  '/planejar',
  lazyRouteComponent(() => import('./routes/Planejar'), 'Planejar'),
);
const insights = filha(
  '/insights',
  lazyRouteComponent(() => import('./routes/Insights'), 'Insights'),
);
const desempenho = filha(
  '/desempenho',
  lazyRouteComponent(() => import('./routes/Desempenho'), 'Desempenho'),
);
const carreira = filha(
  '/carreira',
  lazyRouteComponent(() => import('./routes/Carreira'), 'Carreira'),
);
const importar = filha(
  '/importar',
  lazyRouteComponent(() => import('./routes/Importar'), 'Importar'),
);
const sobre = filha(
  '/sobre',
  lazyRouteComponent(() => import('./routes/Sobre'), 'Sobre'),
);

const entrar = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  component: lazyRouteComponent(() => import('./routes/Entrar'), 'Entrar'),
});

const kit = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kit',
  component: lazyRouteComponent(() => import('./routes/Kit'), 'Kit'),
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    inicio,
    percurso,
    planejar,
    insights,
    desempenho,
    carreira,
    importar,
    sobre,
  ]),
  entrar,
  kit,
]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
