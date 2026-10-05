import { Button, Card, ProgressBar } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useNavigate } from '@tanstack/react-router';
import { CATALOGO } from '../dados/catalogo';
import { useSessao } from '../dados/preferencias';
import s from './Sobre.module.css';
import { METAS } from './sobre/metas';

const REPOSITORIO = 'https://github.com/luccas-amorim/akademos';
const GUIA_REGISTRO = `${REPOSITORIO}/blob/main/docs/registro.md`;

/** Página pública: o que é o Akademos, quem mantém e como apoiar. */
export function Sobre() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const sessao = useSessao();

  const NOMES_SISTEMA = {
    sigaa: 'SIGAA',
    jupiter: 'JúpiterWeb',
    outro: t`Sistema próprio`,
  } as const;
  const universidades = CATALOGO.map((e) => ({
    nome: e.pacote.instituicao.nome + (e.ficticia ? ` (${t`fictícia`})` : ''),
    sistema: NOMES_SISTEMA[e.pacote.instituicao.sistema],
    estado: e.conector
      ? { texto: t`Histórico, oferta e lotação`, cor: 'var(--olive-ink)' }
      : e.modeloHistorico
        ? { texto: t`Só histórico (PDF)`, cor: 'var(--primary)' }
        : { texto: t`Matriz pronta · entrada manual`, cor: 'var(--primary)' },
  }));

  return (
    <div className={s.pagina}>
      <section className={s.abertura}>
        <div className="ak-small ak-muted">
          <Trans>Código aberto · licença MIT</Trans>
        </div>
        <h1 className={s.titulo}>
          <Trans>Seu percurso na graduação, num só lugar que é seu.</Trans>
        </h1>
        <p className={s.lide}>
          <Trans>
            Matriz, horário, notas, turmas e carreira, conectados entre si e com o sistema da sua
            universidade. Funciona com qualquer curso. Seus dados ficam no seu aparelho.
          </Trans>
        </p>
        <div className={s.botoes}>
          <Button onPress={() => void navigate({ to: sessao ? '/importar' : '/entrar' })}>
            <Trans>Começar com meu curso</Trans>
          </Button>
          <a className={s.botaoContorno} href={REPOSITORIO}>
            <Trans>Ver no GitHub</Trans>
          </a>
        </div>
        <div className={s.mito}>
          <Trans>
            Akademos é o herói ateniense dono do bosque de oliveiras onde Platão fundou a Academia.
          </Trans>
        </div>
      </section>

      <section className={s.secao}>
        <h2 className="ak-h2" style={{ fontSize: 24 }}>
          <Trans>Universidades conectadas</Trans>
        </h2>
        <div className="ak-small ak-muted">
          <Trans>
            Cada matriz e cada conector são mantidos por estudantes daquela universidade.
          </Trans>
        </div>
        <Card padding="none">
          {universidades.map((u) => (
            <div key={u.nome} className={s.linhaUniversidade}>
              <span style={{ fontWeight: 500 }}>{u.nome}</span>
              <span className="ak-muted ak-small">{u.sistema}</span>
              <span className="ak-small" style={{ color: u.estado.cor, fontWeight: 500 }}>
                {u.estado.texto}
              </span>
            </div>
          ))}
          <div className={s.linhaUniversidade}>
            <span style={{ fontWeight: 500 }}>
              <Trans>Sua universidade</Trans>
            </span>
            <span className="ak-muted ak-small">—</span>
            <a className="ak-small" href={GUIA_REGISTRO} style={{ fontWeight: 500 }}>
              <Trans>Adicione sua matriz →</Trans>
            </a>
          </div>
        </Card>
      </section>

      <section className={s.pilares}>
        <div>
          <div className={s.pilarTitulo}>
            <Trans>Local primeiro</Trans>
          </div>
          <p className={s.pilarTexto}>
            <Trans>
              Notas e histórico ficam no aparelho. Sincronizar é opcional e criptografado.
            </Trans>
          </p>
        </div>
        <div>
          <div className={s.pilarTitulo}>
            <Trans>Comunidade, de forma anônima</Trans>
          </div>
          <p className={s.pilarTexto}>
            <Trans>
              Correlações e previsões só existem porque alunos optam por compartilhar históricos sem
              identificação.
            </Trans>
          </p>
        </div>
        <div>
          <div className={s.pilarTitulo}>
            <Trans>Qualquer matriz</Trans>
          </div>
          <p className={s.pilarTexto}>
            <Trans>
              Créditos, faixas, séries ou semestres, regras de aprovação: tudo vem dos dados, nada
              do código.
            </Trans>
          </p>
        </div>
      </section>

      <Card as="section" padding="lg" className={s.apoio}>
        <div className={s.apoioTopo}>
          <div>
            <h2 className="ak-h2" style={{ fontSize: 24 }}>
              <Trans>Mantido por quem usa</Trans>
            </h2>
            <div className="ak-small ak-muted" style={{ marginTop: 4 }}>
              <Trans>Sem anúncios e sem venda de dados. O projeto vive de patrocínio.</Trans>
            </div>
          </div>
          <a className={s.botaoOliva} href="https://github.com/sponsors/luccas-amorim">
            <Trans>Patrocinar no GitHub</Trans>
          </a>
        </div>
        {METAS.map((m) => (
          <div key={m.titulo} className={s.meta}>
            <div className={s.metaTopo}>
              <span style={{ fontWeight: 500 }}>{m.titulo}</span>
              <span className="ak-mono ak-muted" style={{ fontSize: 12.5 }}>
                {m.rotuloProgresso ?? t`meta: ${m.alvo}`}
              </span>
            </div>
            {m.progresso !== null && (
              <ProgressBar size="md" color="var(--olive)" label={m.titulo} value={m.progresso} />
            )}
          </div>
        ))}
        <div className="ak-small ak-muted">
          <Trans>
            Também por <a href="https://luccas-amorim.github.io/apoie/">PIX</a>.
          </Trans>
        </div>
      </Card>

      <section className={s.secao} id="privacidade">
        <h2 className="ak-h2" style={{ fontSize: 21 }}>
          <Trans>Privacidade</Trans>
        </h2>
        <ul className={s.lista}>
          <li>
            <Trans>
              Sem conta, nada sai do seu aparelho: o banco é um SQLite no próprio navegador ou app.
            </Trans>
          </li>
          <li>
            <Trans>
              Com conta, os dados são cifrados no aparelho (XChaCha20-Poly1305) com uma chave
              derivada da sua frase de recuperação. O servidor guarda só blobs ilegíveis.
            </Trans>
          </li>
          <li>
            <Trans>
              Credenciais da universidade nunca saem do aparelho; conectores rodam nele.
            </Trans>
          </li>
          <li>
            <Trans>
              Compartilhar com a comunidade é opcional (consentimento, LGPD art. 7º, I). Agregados
              só são publicados com pelo menos 10 históricos por célula e com ruído estatístico.
            </Trans>
          </li>
          <li>
            <Trans>
              Você pode exportar tudo (JSON e CSV) e apagar os dados do aparelho ou a conta a
              qualquer momento, em Seus dados.
            </Trans>
          </li>
        </ul>
      </section>

      <section className={s.secao} id="termos">
        <h2 className="ak-h2" style={{ fontSize: 21 }}>
          <Trans>Termos</Trans>
        </h2>
        <p className={s.pilarTexto}>
          <Trans>
            O Akademos é software livre (licença MIT), oferecido sem garantia. Previsões e insights
            são estimativas para ajudar a decidir, não substituem as regras oficiais do seu curso.
            Conectores acessam o sistema da universidade com a sua credencial e em seu nome: use-os
            de acordo com as regras da sua instituição.
          </Trans>
        </p>
      </section>
    </div>
  );
}
