import {
  compararSemestres,
  deslocarSemestre,
  ordinalDoSemestre,
  semestreDaData,
  type CoberturaCompetencia,
  type Objetivo,
} from '@akademos/core';
import { Button, Card, PageHeader, ProgressBar, TextField } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import {
  apagarDoDiario,
  apagarMarco,
  registrarNoDiario,
  salvarMarco,
  tornarPrincipal,
} from '../dados/acoes';
import { useAnalise } from '../dados/analise';
import { EditorObjetivo } from './carreira/EditorObjetivo';
import s from './Carreira.module.css';

function corDaCobertura(p: number): string {
  return p >= 70 ? 'var(--olive-ink)' : p >= 40 ? 'var(--primary)' : 'var(--amber)';
}

export function Carreira() {
  const { t } = useLingui();
  const a = useAnalise();
  const { dados } = a;
  const principal = dados.objetivos.find((o) => o.principal);
  const alternativas = dados.objetivos.filter((o) => !o.principal);
  const [editando, setEditando] = useState<Objetivo | 'novo' | null>(null);
  const nome = (c: string) => dados.matriz.disciplinas.find((d) => d.codigo === c)?.nome ?? c;

  const descrever = (c: CoberturaCompetencia): string => {
    const feitas = [...c.cumpridas, ...c.emCurso].map(nome).concat(c.atividadesFeitas);
    if (c.percentual >= 70 || !c.faltando.length) {
      return feitas.join(', ') || c.atividadesPendentes.join(', ');
    }
    const ofertaSugerida = a.ctx.ofertasProximas.find(
      (o) => c.faltando.includes(o.disciplinaCodigo) && a.ctx.elegivel(o.disciplinaCodigo),
    );
    if (ofertaSugerida && c.percentual < 40) {
      const rotulo = ofertaSugerida.titulo
        ? t`eletiva ${ofertaSugerida.titulo}`
        : nome(ofertaSugerida.disciplinaCodigo);
      return t`Sugestão: ${rotulo} em ${a.proximoSemestre}`;
    }
    const partes = [t`Falta: ${c.faltando.map(nome).join(', ')}`];
    if (feitas.length) partes.unshift(feitas.join(', '));
    return partes.join(' · ');
  };

  if (editando) {
    return (
      <div className={s.pagina}>
        <PageHeader title={<Trans>Carreira</Trans>} />
        <EditorObjetivo
          objetivo={editando === 'novo' ? null : editando}
          principal={editando === 'novo' ? !principal : editando.principal}
          aoFechar={() => setEditando(null)}
        />
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <PageHeader
        title={<Trans>Carreira</Trans>}
        subtitle={
          <Trans>O que você quer fazer depois, e quanto do percurso já aponta para lá</Trans>
        }
      />
      <div className={s.colunas}>
        <Card padding="lg" as="section" className={s.objetivo}>
          {principal && a.aderencia ? (
            <>
              <div className={s.topo}>
                <div>
                  <div className="ak-eyebrow">
                    <Trans>Objetivo principal</Trans>
                  </div>
                  <h2 className={s.titulo}>{principal.titulo}</h2>
                  {alternativas.map((o) => (
                    <div key={o.id} className="ak-small ak-muted" style={{ marginTop: 2 }}>
                      <Trans>Alternativa: {o.titulo}</Trans>{' '}
                      <Button
                        variant="link"
                        onPress={() => void tornarPrincipal(dados.objetivos, o.id)}
                      >
                        <Trans>tornar principal</Trans>
                      </Button>
                    </div>
                  ))}
                </div>
                <div className={s.aderencia}>
                  <div className={s.aderenciaValor}>{a.aderencia.percentual}%</div>
                  <div className="ak-caption">
                    <Trans>aderência</Trans>
                  </div>
                </div>
              </div>
              {a.aderencia.competencias.map((c) => (
                <div key={c.nome} className={s.competencia}>
                  <div className={s.compTopo}>
                    <span style={{ fontWeight: 500 }}>{c.nome}</span>
                    <span className="ak-mono" style={{ fontSize: 12 }}>
                      {c.percentual}%
                    </span>
                  </div>
                  <ProgressBar
                    size="md"
                    label={c.nome}
                    value={c.percentual}
                    color={corDaCobertura(c.percentual)}
                  />
                  <div className="ak-caption">{descrever(c)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="subtle" size="sm" onPress={() => setEditando(principal)}>
                  <Trans>Editar objetivo</Trans>
                </Button>
                <Button variant="subtle" size="sm" onPress={() => setEditando('novo')}>
                  <Trans>Adicionar alternativa</Trans>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="ak-h2 ak-h2--sm">
                <Trans>Qual é o seu objetivo?</Trans>
              </h2>
              <p className="ak-small ak-muted" style={{ margin: 0 }}>
                <Trans>
                  Declare o que quer fazer depois e as competências que isso exige. O Akademos
                  mostra quanto do seu percurso já cobre cada uma.
                </Trans>
              </p>
              <Button style={{ alignSelf: 'flex-start' }} onPress={() => setEditando('novo')}>
                <Trans>Definir objetivo</Trans>
              </Button>
            </>
          )}
        </Card>

        <div className={s.direita}>
          <Marcos />
          <Diario />
        </div>
      </div>
    </div>
  );
}

function Marcos() {
  const { t } = useLingui();
  const { dados, semestreAtual } = useAnalise();
  const [titulo, setTitulo] = useState('');
  const [semestre, setSemestre] = useState(deslocarSemestre(semestreAtual, 1));
  const marcos = [...dados.marcos].sort((x, y) => compararSemestres(x.semestre, y.semestre));
  const opcoes = Array.from({ length: 10 }, (_, i) => deslocarSemestre(semestreAtual, i));

  const adicionar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    void salvarMarco({
      alunoId: dados.aluno.id,
      semestre,
      titulo: titulo.trim(),
      descricao: null,
      feito: false,
    });
    setTitulo('');
  };

  return (
    <Card padding="lg" as="section">
      <h2 className="ak-h2 ak-h2--sm" style={{ marginBottom: 14 }}>
        <Trans>Marcos até a formatura</Trans>
      </h2>
      {marcos.map((m) => {
        // Preenchido: concluído ou em andamento (semestre atual ou passado).
        const cheio = m.feito || compararSemestres(m.semestre, semestreAtual) <= 0;
        return (
          <div key={m.id} className={s.marco}>
            <span className="ak-mono ak-muted" style={{ fontSize: 12, paddingTop: 1 }}>
              {m.semestre}
            </span>
            <button
              type="button"
              className={s.ponto}
              style={{ background: cheio ? 'var(--primary)' : 'var(--surface)' }}
              aria-pressed={m.feito}
              aria-label={
                m.feito ? t`Marcar ${m.titulo} como pendente` : t`Marcar ${m.titulo} como feito`
              }
              onClick={() => void salvarMarco({ ...m, feito: !m.feito })}
            />
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: m.feito ? 'line-through' : undefined,
                }}
              >
                {m.titulo}
              </div>
              {m.descricao && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{m.descricao}</div>
              )}
            </div>
            <button
              type="button"
              className={s.remover}
              onClick={() => void apagarMarco(m.id)}
              aria-label={t`Remover ${m.titulo}`}
            >
              ×
            </button>
          </div>
        );
      })}
      <form className={s.linhaForm} onSubmit={adicionar}>
        <label className="ak-field">
          <Trans>Semestre</Trans>
          <select
            className="ak-select ak-select--sm"
            value={semestre}
            onChange={(e) => setSemestre(e.target.value)}
          >
            {opcoes.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <TextField
              size="sm"
              label={t`Novo marco`}
              value={titulo}
              onChange={setTitulo}
              placeholder={t`Ex.: intercâmbio`}
            />
          </div>
          <Button type="submit" size="sm">
            <Trans>Adicionar</Trans>
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Diario() {
  const { t } = useLingui();
  const { dados } = useAnalise();
  const [texto, setTexto] = useState('');
  const entradas = [...dados.diario].sort((x, y) => y.data.localeCompare(x.data));
  const mes = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

  const rotulo = (data: string) => {
    const d = new Date(`${data}T12:00:00`);
    const m = mes.format(d).replace('.', '').replace(' de ', ' ');
    const ordinal = ordinalDoSemestre(dados.aluno.ingresso, semestreDaData(d));
    return `${m.charAt(0).toUpperCase()}${m.slice(1)} · ${t`${ordinal}º semestre`}`;
  };

  return (
    <Card padding="lg" as="section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 className="ak-h2 ak-h2--sm">
        <Trans>Diário de expectativas</Trans>
      </h2>
      <div className="ak-small ak-muted">
        <Trans>Escreva o que você espera a cada semestre. O Akademos mostra como isso mudou.</Trans>
      </div>
      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          void registrarNoDiario(dados.aluno.id, texto);
          setTexto('');
        }}
      >
        <TextField
          label={<span className="ak-sr-only">{t`Nova entrada`}</span>}
          multiline
          value={texto}
          onChange={setTexto}
          placeholder={t`O que você espera do próximo semestre?`}
        />
        {texto.trim() && (
          <Button type="submit" size="sm" style={{ alignSelf: 'flex-end' }}>
            <Trans>Registrar</Trans>
          </Button>
        )}
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entradas.map((e) => (
          <div key={e.id} className={s.entrada}>
            <div>
              <div className="ak-caption">{rotulo(e.data)}</div>
              <div className={s.entradaTexto}>{e.texto}</div>
            </div>
            <button
              type="button"
              className={s.remover}
              onClick={() => void apagarDoDiario(e.id)}
              aria-label={t`Apagar entrada`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
