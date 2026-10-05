import {
  compararSemestres,
  deslocarSemestre,
  semestreDaData,
  semestreDoOrdinal,
  type Cursada,
  type DadosLocais,
  type SituacaoCursada,
} from '@akademos/core';
import { Button } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { apagarCursada, importarCursadas } from '../../dados/acoes';
import s from './importar.module.css';

type Situacao =
  '' | Extract<SituacaoCursada, 'aprovada' | 'cursando' | 'reprovada' | 'aproveitada'>;

interface Linha {
  situacao: Situacao;
  nota: string;
  semestre: string;
  /** Cursada existente que esta linha edita. */
  id: string | null;
}

export function ImportarManual({
  dados,
  aoConcluir,
}: {
  dados: DadosLocais;
  aoConcluir: () => void;
}) {
  const { t } = useLingui();
  const { matriz, aluno, escala } = dados;
  const totalSemestres = Math.max(...matriz.disciplinas.map((d) => d.semestreSugerido));
  const [aba, setAba] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const atual = semestreDaData(new Date());
  const opcoesSemestre = useMemo(() => {
    const out: string[] = [];
    for (let s = aluno.ingresso; compararSemestres(s, atual) <= 0; s = deslocarSemestre(s, 1))
      out.push(s);
    return out;
  }, [aluno.ingresso, atual]);

  const inicial = useMemo(() => {
    const m: Record<string, Linha> = {};
    for (const d of matriz.disciplinas) {
      const ultima = dados.cursadas
        .filter((c) => c.disciplinaCodigo === d.codigo)
        .sort((a, b) => compararSemestres(a.semestre, b.semestre))
        .at(-1);
      const sugerido = semestreDoOrdinal(aluno.ingresso, d.semestreSugerido);
      m[d.codigo] = {
        situacao: ultima && ultima.situacao !== 'trancada' ? ultima.situacao : '',
        nota: ultima?.nota != null ? String(ultima.nota).replace('.', ',') : '',
        semestre: ultima?.semestre ?? (compararSemestres(sugerido, atual) <= 0 ? sugerido : atual),
        id: ultima?.id ?? null,
      };
    }
    return m;
  }, [matriz, dados.cursadas, aluno.ingresso, atual]);
  const [linhas, setLinhas] = useState(inicial);
  const alterar = (codigo: string, mudanca: Partial<Linha>) =>
    setLinhas((x) => ({ ...x, [codigo]: { ...x[codigo]!, ...mudanca } }));

  const salvar = async () => {
    setAviso(null);
    const novas: Cursada[] = [];
    const remover: string[] = [];
    for (const d of matriz.disciplinas) {
      const l = linhas[d.codigo]!;
      if (!l.situacao) {
        if (l.id) remover.push(l.id);
        continue;
      }
      const nota = l.nota.trim() ? Number(l.nota.replace(',', '.')) : null;
      if (nota !== null && (!Number.isFinite(nota) || nota < escala.min || nota > escala.max)) {
        setAviso(t`Nota inválida em ${d.nome}: use de ${escala.min} a ${escala.max}.`);
        return;
      }
      novas.push({
        id: l.id ?? crypto.randomUUID(),
        alunoId: aluno.id,
        disciplinaCodigo: d.codigo,
        semestre: l.semestre,
        nota: l.situacao === 'cursando' ? null : nota,
        frequencia: null,
        situacao: l.situacao,
      });
    }
    setSalvando(true);
    try {
      await importarCursadas(novas, dados.cursadas);
      for (const id of remover) await apagarCursada(id);
      aoConcluir();
    } finally {
      setSalvando(false);
    }
  };

  const doSemestre = matriz.disciplinas.filter((d) => d.semestreSugerido === aba);
  return (
    <section className={s.painel}>
      <div style={{ fontWeight: 600 }}>
        <Trans>Marque o que você já cursou</Trans>
      </div>
      <div className="ak-small" style={{ color: 'var(--ink-body)' }}>
        <Trans>
          A matriz {matriz.ano} já está carregada (mantida pela comunidade). Marque semestre a
          semestre e lance as notas depois, se quiser.
        </Trans>
      </div>
      <div className={s.chips} role="group" aria-label={t`Semestre da matriz`}>
        {Array.from({ length: totalSemestres }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={s.chip}
            aria-pressed={aba === n}
            onClick={() => setAba(n)}
          >
            <Trans>{n}º semestre</Trans>
          </button>
        ))}
      </div>
      <div className={s.manual}>
        <span className="ak-caption">
          <Trans>Disciplina</Trans>
        </span>
        <span className="ak-caption">
          <Trans>Nota</Trans>
        </span>
        <span className="ak-caption">
          <Trans>Semestre</Trans>
        </span>
        {doSemestre.map((d) => {
          const l = linhas[d.codigo]!;
          return (
            <div key={d.codigo} style={{ display: 'contents' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>
                  <span className="ak-mono ak-muted" style={{ fontSize: 11 }}>
                    {d.codigo}
                  </span>{' '}
                  {d.nome}
                </span>
                <select
                  className="ak-select ak-select--sm"
                  value={l.situacao}
                  onChange={(e) => alterar(d.codigo, { situacao: e.target.value as Situacao })}
                >
                  <option value="">{t`Não cursada`}</option>
                  <option value="aprovada">{t`Aprovada`}</option>
                  <option value="cursando">{t`Cursando`}</option>
                  <option value="reprovada">{t`Reprovada`}</option>
                  <option value="aproveitada">{t`Aproveitada`}</option>
                </select>
              </label>
              <input
                className="ak-input ak-input--sm"
                inputMode="decimal"
                aria-label={t`Nota em ${d.nome}`}
                placeholder="—"
                value={l.nota}
                disabled={!l.situacao || l.situacao === 'cursando'}
                onChange={(e) => alterar(d.codigo, { nota: e.target.value })}
              />
              <select
                className="ak-select ak-select--sm"
                aria-label={t`Semestre em que cursou ${d.nome}`}
                value={l.semestre}
                disabled={!l.situacao}
                onChange={(e) => alterar(d.codigo, { semestre: e.target.value })}
              >
                {opcoesSemestre.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {aviso && (
        <div className={s.erro} role="alert">
          {aviso}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button onPress={() => void salvar()} isDisabled={salvando}>
          <Trans>Salvar e continuar</Trans>
        </Button>
      </div>
    </section>
  );
}
