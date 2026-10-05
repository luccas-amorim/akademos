import { montarPacotes, type EntradaCatalogo } from '@akademos/registry';
import { lerInstituicoes } from '@akademos/registry/node';
import { Hono } from 'hono';

/**
 * Espelho do registro: o app traz o catálogo embutido e pode buscar versões
 * novas aqui. Só dados públicos (matrizes e modelos de histórico).
 */
export function rotasRegistro() {
  let cache: { geradoEm: string; entradas: EntradaCatalogo[] } | null = null;
  const catalogo = () => {
    cache ??= {
      geradoEm: new Date().toISOString(),
      entradas: lerInstituicoes().flatMap((arq) => montarPacotes(arq).entradas),
    };
    return cache;
  };
  const app = new Hono();
  app.get('/', (c) => {
    const { geradoEm, entradas } = catalogo();
    return c.json({
      geradoEm,
      matrizes: entradas.map((e) => ({
        id: e.pacote.matriz.id,
        instituicao: e.pacote.instituicao.nome,
        curso: e.pacote.curso.nome,
        ano: e.pacote.matriz.ano,
        versao: e.pacote.matriz.versaoRegistro,
        ficticia: e.ficticia,
      })),
    });
  });
  app.get('/matriz/:sigla/:curso/:ano', (c) => {
    const id = `${c.req.param('sigla')}/${c.req.param('curso')}/${c.req.param('ano')}`;
    const e = catalogo().entradas.find((x) => x.pacote.matriz.id === id);
    if (!e) return c.json({ erro: 'nao-encontrada' }, 404);
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(e);
  });
  return app;
}
