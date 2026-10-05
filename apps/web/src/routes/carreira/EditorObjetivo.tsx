import type { Competencia, Objetivo } from '@akademos/core';
import { Button, Card, Checkbox, TextField } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { apagarObjetivo, salvarObjetivo } from '../../dados/acoes';
import { useDados } from '../../dados/store';
import s from '../Carreira.module.css';

interface CompetenciaEditada {
  nome: string;
  disciplinas: string[];
  /** Uma atividade por linha; "[x] " no início marca como feita. */
  atividades: string;
}

function paraEdicao(c: Competencia): CompetenciaEditada {
  return {
    nome: c.nome,
    disciplinas: c.disciplinas,
    atividades: (c.atividades ?? []).map((a) => `${a.feito ? '[x] ' : ''}${a.titulo}`).join('\n'),
  };
}

function deEdicao(c: CompetenciaEditada): Competencia {
  const atividades = c.atividades
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ titulo: l.replace(/^\[x\]\s*/i, ''), feito: /^\[x\]/i.test(l) }));
  return {
    nome: c.nome.trim(),
    disciplinas: c.disciplinas,
    ...(atividades.length ? { atividades } : {}),
  };
}

export function EditorObjetivo({
  objetivo,
  principal,
  aoFechar,
}: {
  objetivo: Objetivo | null;
  principal: boolean;
  aoFechar: () => void;
}) {
  const { t } = useLingui();
  const dados = useDados();
  const [titulo, setTitulo] = useState(objetivo?.titulo ?? '');
  const [comps, setComps] = useState<CompetenciaEditada[]>(
    objetivo?.competencias.map(paraEdicao) ?? [{ nome: '', disciplinas: [], atividades: '' }],
  );
  const [erro, setErro] = useState<string | null>(null);

  const alterar = (i: number, m: Partial<CompetenciaEditada>) =>
    setComps((x) => x.map((c, j) => (j === i ? { ...c, ...m } : c)));

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const validas = comps.filter((c) => c.nome.trim());
    if (!titulo.trim()) {
      setErro(t`Dê um nome ao objetivo.`);
      return;
    }
    await salvarObjetivo({
      ...(objetivo ? { id: objetivo.id } : {}),
      alunoId: dados.aluno.id,
      titulo: titulo.trim(),
      principal,
      competencias: validas.map(deEdicao),
    });
    aoFechar();
  };

  return (
    <Card padding="lg" as="section">
      <form className={s.editor} onSubmit={salvar}>
        <h2 className="ak-h2 ak-h2--sm">
          {objetivo ? <Trans>Editar objetivo</Trans> : <Trans>Novo objetivo</Trans>}
        </h2>
        <TextField
          label={t`Objetivo`}
          value={titulo}
          onChange={setTitulo}
          placeholder={t`Ex.: ciência de dados em saúde`}
        />
        {comps.map((c, i) => (
          <fieldset key={i} className={s.editorComp}>
            <legend className="ak-small" style={{ fontWeight: 600 }}>
              <Trans>Competência {i + 1}</Trans>
            </legend>
            <TextField
              size="sm"
              label={t`Nome`}
              value={c.nome}
              onChange={(v) => alterar(i, { nome: v })}
            />
            <div className="ak-small" style={{ fontWeight: 500 }}>
              <Trans>Disciplinas que contribuem</Trans>
            </div>
            <div className={s.discGrade}>
              {dados.matriz.disciplinas.map((d) => (
                <Checkbox
                  key={d.codigo}
                  isSelected={c.disciplinas.includes(d.codigo)}
                  onChange={(v) =>
                    alterar(i, {
                      disciplinas: v
                        ? [...c.disciplinas, d.codigo]
                        : c.disciplinas.filter((x) => x !== d.codigo),
                    })
                  }
                >
                  {d.nome}
                </Checkbox>
              ))}
            </div>
            <TextField
              size="sm"
              multiline
              label={t`Atividades fora da matriz (uma por linha; "[x]" no início = feita)`}
              value={c.atividades}
              onChange={(v) => alterar(i, { atividades: v })}
            />
            <Button variant="link" onPress={() => setComps((x) => x.filter((_, j) => j !== i))}>
              <Trans>Remover competência</Trans>
            </Button>
          </fieldset>
        ))}
        <Button
          variant="subtle"
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => setComps((x) => [...x, { nome: '', disciplinas: [], atividades: '' }])}
        >
          <Trans>+ Competência</Trans>
        </Button>
        {erro && (
          <div role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
            {erro}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button type="submit">
            <Trans>Salvar</Trans>
          </Button>
          <Button variant="subtle" onPress={aoFechar}>
            <Trans>Cancelar</Trans>
          </Button>
          {objetivo && !objetivo.principal && (
            <Button
              variant="link"
              onPress={async () => {
                await apagarObjetivo(objetivo.id);
                aoFechar();
              }}
            >
              <Trans>Apagar objetivo</Trans>
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
