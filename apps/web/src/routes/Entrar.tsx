import { gerarFrase } from '@akademos/sync';
import { Button, Checkbox, Divider, LogoMark, Note, Segmented, TextField } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { getStoredPopupToken } from 'better-auth/client/plugins';
import { useEffect, useState, type FormEvent } from 'react';
import { ClienteRelay } from '@akademos/sync';
import { gravarChaveLocal, prepararChaveNova, recuperarChave } from '../conta/chave';
import { auth } from '../conta/cliente';
import { API_URL, temServidor } from '../conta/config';
import { servicoSync } from '../conta/sincronizacao';
import { gravarToken, lerToken } from '../conta/token';
import { carregarExemplo } from '../dados/acoes';
import { gravarPreferencia } from '../dados/preferencias';
import { store } from '../dados/store';
import s from './Entrar.module.css';

type Modo = 'entrar' | 'criar';
type Etapa =
  | { tipo: 'formulario' }
  | { tipo: 'link-enviado'; email: string }
  | { tipo: 'frase-nova'; frase: string }
  | { tipo: 'confirmar-frase'; frase: string; posicoes: number[] }
  | { tipo: 'informar-frase'; sal: string; verificador: string };

const relay = () => new ClienteRelay({ url: API_URL!, token: lerToken });

function sortearPosicoes(): number[] {
  const p = new Set<number>();
  while (p.size < 3) p.add(Math.floor(Math.random() * 12));
  return [...p].sort((a, b) => a - b);
}

/** Senha aleatória para contas criadas por passkey (nunca é mostrada). */
function senhaAleatoria(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b));
}

export function Entrar() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const busca = useSearch({ from: '/entrar' }) as { modo?: Modo; link?: string };
  const [modo, setModo] = useState<Modo>(busca.modo ?? 'entrar');
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'formulario' });
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const servidor = temServidor();
  const criar = modo === 'criar';

  /** Depois de autenticar: chave nova (primeira vez) ou frase (outro aparelho). */
  const aposAutenticar = async () => {
    const chave = await relay().obterChave();
    if (!chave) setEtapa({ tipo: 'frase-nova', frase: gerarFrase() });
    else setEtapa({ tipo: 'informar-frase', ...chave });
  };

  const finalizar = async () => {
    gravarPreferencia('sessao', 'conta');
    await store.iniciar();
    await servicoSync.sincronizarAgora();
    void navigate({ to: '/' });
  };

  const executar = async (fn: () => Promise<void>) => {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  const falhou = (r: { error: { message?: string; code?: string } | null }) => {
    if (r.error) throw new Error(r.error.message ?? r.error.code ?? t`Não foi possível entrar.`);
  };

  // Link mágico: o e-mail abre /entrar?link=… e o app confirma o token.
  useEffect(() => {
    if (!busca.link || !servidor) return;
    void executar(async () => {
      falhou(await auth.magicLink.verify({ query: { token: busca.link! } }));
      await aposAutenticar();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca.link]);

  const comChaveDeAcesso = () =>
    executar(async () => {
      if (criar) {
        if (!email || !nome) throw new Error(t`Preencha nome e e-mail para criar a conta.`);
        falhou(await auth.signUp.email({ email, name: nome, password: senhaAleatoria() }));
        falhou(await auth.passkey.addPasskey({ name: t`Akademos neste aparelho` }));
      } else {
        falhou(await auth.signIn.passkey());
      }
      await aposAutenticar();
    });

  const comGoogle = () =>
    executar(async () => {
      falhou(await auth.signIn.popup({ provider: 'google' }));
      const token = getStoredPopupToken();
      if (token) gravarToken(token);
      await aposAutenticar();
    });

  const comLinkMagico = () =>
    executar(async () => {
      if (!email) throw new Error(t`Informe seu e-mail institucional.`);
      const volta = `${window.location.origin}${import.meta.env.BASE_URL}entrar`;
      falhou(
        await auth.signIn.magicLink({
          email,
          callbackURL: volta,
          ...(criar && nome ? { name: nome } : {}),
        }),
      );
      setEtapa({ tipo: 'link-enviado', email });
    });

  const comSenha = (e: FormEvent) => {
    e.preventDefault();
    void executar(async () => {
      falhou(
        criar
          ? await auth.signUp.email({ email, password: senha, name: nome || email.split('@')[0]! })
          : await auth.signIn.email({ email, password: senha }),
      );
      await aposAutenticar();
    });
  };

  const usarSemConta = () => {
    gravarPreferencia('sessao', 'local');
    void navigate({ to: '/importar' });
  };

  const explorar = () =>
    executar(async () => {
      gravarPreferencia('sessao', 'local');
      await store.iniciar();
      await carregarExemplo();
      void navigate({ to: '/' });
    });

  return (
    <div className={s.tela}>
      <section className={s.painel}>
        <div className={s.marca}>
          <LogoMark size={24} onDark />
          Akademos
        </div>
        <div className={s.proposta}>
          <h1>
            <Trans>Seu percurso acadêmico, do primeiro semestre à formatura.</Trans>
          </h1>
          <p>
            <Trans>
              Histórico, planejamento de matrícula e previsões calculadas no seu aparelho. Seus
              dados não saem dele sem você pedir.
            </Trans>
          </p>
        </div>
        <div className={s.pilares}>
          <div className={s.pilar}>
            <span className={s.numero}>01</span>
            <Trans>Local primeiro — funciona offline</Trans>
          </div>
          <div className={s.pilar}>
            <span className={s.numero}>02</span>
            <Trans>Sincronização opcional e criptografada</Trans>
          </div>
          <div className={s.pilar}>
            <span className={s.numero}>03</span>
            <Trans>Código aberto · qualquer universidade</Trans>
          </div>
        </div>
      </section>

      <section className={s.lado}>
        <div className={s.formulario}>
          {etapa.tipo === 'formulario' && (
            <>
              <Segmented
                label={t`Entrar ou criar conta`}
                value={modo}
                onChange={setModo}
                options={[
                  { id: 'entrar', label: t`Entrar` },
                  { id: 'criar', label: t`Criar conta` },
                ]}
              />
              <div>
                <h2 className={`ak-h2 ${s.titulo}`}>
                  {criar ? <Trans>Criar conta</Trans> : <Trans>Bem-vinda(o) de volta</Trans>}
                </h2>
                <div className={s.sub}>
                  {criar ? (
                    <Trans>
                      A conta serve só para sincronizar entre aparelhos. Seus dados ficam
                      criptografados com uma chave que só você tem.
                    </Trans>
                  ) : (
                    <Trans>Entre para sincronizar seu percurso entre aparelhos.</Trans>
                  )}
                </div>
              </div>
              {!servidor && (
                <Note tone="info">
                  <Trans>
                    Esta publicação não tem servidor de sincronização. Você pode usar tudo sem
                    conta; os dados ficam neste aparelho.
                  </Trans>
                </Note>
              )}
              <Button
                variant="dark"
                size="lg"
                block
                isDisabled={!servidor || ocupado}
                onPress={() => void comChaveDeAcesso()}
              >
                <Trans>Continuar com chave de acesso</Trans>
              </Button>
              <div className={s.linha}>
                <Button
                  variant="outline"
                  size="lg"
                  isDisabled={!servidor || ocupado}
                  onPress={() => void comGoogle()}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  isDisabled={!servidor || ocupado}
                  onPress={() => void comLinkMagico()}
                >
                  <Trans>E-mail institucional</Trans>
                </Button>
              </div>
              <Divider>
                <Trans>ou com e-mail</Trans>
              </Divider>
              <form className={s.campos} onSubmit={comSenha}>
                {criar && (
                  <TextField
                    label={t`Nome`}
                    placeholder={t`Como quer ser chamada(o)`}
                    value={nome}
                    onChange={setNome}
                  />
                )}
                <TextField
                  label={t`E-mail`}
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
                <TextField
                  label={t`Senha`}
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={setSenha}
                  autoComplete={criar ? 'new-password' : 'current-password'}
                  labelAside={
                    !criar && (
                      <Button
                        variant="link"
                        isDisabled={!servidor}
                        onPress={() => void comLinkMagico()}
                        style={{ fontSize: 12.5, fontWeight: 400 }}
                      >
                        <Trans>Esqueci</Trans>
                      </Button>
                    )
                  }
                />
                <Button type="submit" size="lg" block isDisabled={!servidor || ocupado}>
                  {criar ? <Trans>Criar conta</Trans> : <Trans>Entrar</Trans>}
                </Button>
              </form>
              {erro && (
                <div className={s.erro} role="alert">
                  {erro}
                </div>
              )}
              <div className={s.local}>
                <button type="button" className={s.localBotao} onClick={usarSemConta}>
                  <Trans>Usar sem conta, só neste aparelho →</Trans>
                </button>
                <div className="ak-small ak-muted" style={{ fontSize: 12.5 }}>
                  <Trans>
                    Tudo funciona offline. Você pode criar uma conta depois para sincronizar.
                  </Trans>
                </div>
                <button
                  type="button"
                  className={s.localBotao}
                  style={{ color: 'var(--primary)', marginTop: 6 }}
                  onClick={() => void explorar()}
                >
                  <Trans>Explorar com a aluna de exemplo (dados fictícios) →</Trans>
                </button>
              </div>
              <div className={s.rodape}>
                <Link to="/sobre" hash="privacidade">
                  <Trans>Privacidade</Trans>
                </Link>
                <Link to="/sobre" hash="termos">
                  <Trans>Termos</Trans>
                </Link>
                <a href="https://github.com/luccas-amorim/akademos">
                  <Trans>Código-fonte</Trans>
                </a>
              </div>
            </>
          )}

          {etapa.tipo === 'link-enviado' && (
            <>
              <h2 className={`ak-h2 ${s.titulo}`}>
                <Trans>Confira seu e-mail</Trans>
              </h2>
              <p className={s.sub}>
                <Trans>
                  Enviamos um link de acesso para {etapa.email}. Ele vale por 5 minutos.
                </Trans>
              </p>
              <Button variant="subtle" onPress={() => setEtapa({ tipo: 'formulario' })}>
                <Trans>Voltar</Trans>
              </Button>
            </>
          )}

          {etapa.tipo === 'frase-nova' && (
            <FraseNova
              frase={etapa.frase}
              aoContinuar={() =>
                setEtapa({
                  tipo: 'confirmar-frase',
                  frase: etapa.frase,
                  posicoes: sortearPosicoes(),
                })
              }
            />
          )}

          {etapa.tipo === 'confirmar-frase' && (
            <ConfirmarFrase
              frase={etapa.frase}
              posicoes={etapa.posicoes}
              ocupado={ocupado}
              erro={erro}
              aoVoltar={() => setEtapa({ tipo: 'frase-nova', frase: etapa.frase })}
              aoConfirmar={() =>
                void executar(async () => {
                  const { chave, sal, verificador } = await prepararChaveNova(etapa.frase);
                  await relay().registrarChave(sal, verificador);
                  gravarChaveLocal(chave);
                  await finalizar();
                })
              }
            />
          )}

          {etapa.tipo === 'informar-frase' && (
            <InformarFrase
              ocupado={ocupado}
              erro={erro}
              aoInformar={(frase) =>
                void executar(async () => {
                  const chave = await recuperarChave(frase, etapa.sal, etapa.verificador);
                  if (!chave) throw new Error(t`A frase não confere com a desta conta.`);
                  gravarChaveLocal(chave);
                  await finalizar();
                })
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}

function FraseNova({ frase, aoContinuar }: { frase: string; aoContinuar: () => void }) {
  const [anotei, setAnotei] = useState(false);
  return (
    <>
      <div>
        <h2 className={`ak-h2 ${s.titulo}`}>
          <Trans>Sua frase de recuperação</Trans>
        </h2>
        <div className={s.sub}>
          <Trans>
            Ela gera a chave que cifra seus dados antes de saírem do aparelho. O servidor nunca a
            recebe. Anote num lugar seguro: ela aparece só agora.
          </Trans>
        </div>
      </div>
      <ol className={s.palavras} aria-label="Frase de recuperação">
        {frase.split(' ').map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
      <Note tone="danger">
        <Trans>
          Sem a frase, os dados sincronizados não podem ser recuperados em outro aparelho — nem por
          nós.
        </Trans>
      </Note>
      <Checkbox isSelected={anotei} onChange={setAnotei}>
        <Trans>Anotei a frase num lugar seguro</Trans>
      </Checkbox>
      <Button size="lg" block isDisabled={!anotei} onPress={aoContinuar}>
        <Trans>Continuar</Trans>
      </Button>
    </>
  );
}

function ConfirmarFrase({
  frase,
  posicoes,
  ocupado,
  erro,
  aoVoltar,
  aoConfirmar,
}: {
  frase: string;
  posicoes: number[];
  ocupado: boolean;
  erro: string | null;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}) {
  const { t } = useLingui();
  const palavras = frase.split(' ');
  const [respostas, setRespostas] = useState<string[]>(posicoes.map(() => ''));
  const confere = posicoes.every((p, i) => respostas[i]!.trim().toLowerCase() === palavras[p]);
  return (
    <form
      className={s.campos}
      onSubmit={(e) => {
        e.preventDefault();
        if (confere) aoConfirmar();
      }}
    >
      <h2 className={`ak-h2 ${s.titulo}`}>
        <Trans>Confirme a frase</Trans>
      </h2>
      <div className={s.sub}>
        <Trans>Digite as palavras pedidas para mostrar que você anotou.</Trans>
      </div>
      {posicoes.map((p, i) => (
        <TextField
          key={p}
          label={t`Palavra ${p + 1}`}
          value={respostas[i]}
          autoComplete="off"
          onChange={(v) => setRespostas((r) => r.map((x, j) => (j === i ? v : x)))}
        />
      ))}
      {erro && (
        <div className={s.erro} role="alert">
          {erro}
        </div>
      )}
      <Button type="submit" size="lg" block isDisabled={!confere || ocupado}>
        {ocupado ? <Trans>Gerando a chave…</Trans> : <Trans>Confirmar e criar a chave</Trans>}
      </Button>
      <Button variant="link" onPress={aoVoltar}>
        <Trans>Ver a frase de novo</Trans>
      </Button>
    </form>
  );
}

function InformarFrase({
  ocupado,
  erro,
  aoInformar,
}: {
  ocupado: boolean;
  erro: string | null;
  aoInformar: (frase: string) => void;
}) {
  const { t } = useLingui();
  const [frase, setFrase] = useState('');
  return (
    <form
      className={s.campos}
      onSubmit={(e) => {
        e.preventDefault();
        aoInformar(frase);
      }}
    >
      <h2 className={`ak-h2 ${s.titulo}`}>
        <Trans>Frase de recuperação</Trans>
      </h2>
      <div className={s.sub}>
        <Trans>
          Esta conta já sincroniza dados. Digite as 12 palavras para decifrá-los neste aparelho.
        </Trans>
      </div>
      <TextField
        label={t`As 12 palavras, separadas por espaço`}
        multiline
        value={frase}
        onChange={setFrase}
        autoComplete="off"
      />
      {erro && (
        <div className={s.erro} role="alert">
          {erro}
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        block
        isDisabled={ocupado || frase.trim().split(/\s+/).length !== 12}
      >
        {ocupado ? <Trans>Conferindo…</Trans> : <Trans>Continuar</Trans>}
      </Button>
    </form>
  );
}
