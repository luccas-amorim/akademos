import { ROTULO_DIA, rotuloFaixa, type Dia } from '@akademos/core';
import { Button, Checkbox, TextField } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { salvarOferta } from '../../dados/acoes';
import { useAnalise } from '../../dados/analise';
import s from '../Planejar.module.css';

/** Lançamento manual de turma, para quem não tem conector. */
export function NovaTurma({ semestre }: { semestre: string }) {
  const { t } = useLingui();
  const { dados, ctx } = useAnalise();
  const { matriz, instituicao } = dados;
  const elegiveis = matriz.disciplinas.filter((d) => ctx.elegivel(d.codigo));
  const [aberto, setAberto] = useState(false);
  const [disciplina, setDisciplina] = useState(elegiveis[0]?.codigo ?? '');
  const [turma, setTurma] = useState('T01');
  const [professor, setProfessor] = useState('');
  const [vagas, setVagas] = useState('40');
  const [interessados, setInteressados] = useState('0');
  const [horarios, setHorarios] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <Button variant="link" onPress={() => setAberto(true)}>
        <Trans>+ Lançar turma à mão</Trans>
      </Button>
    );
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!disciplina || !horarios.size) {
      setErro(t`Escolha a disciplina e pelo menos um horário.`);
      return;
    }
    await salvarOferta({
      semestre,
      disciplinaCodigo: disciplina,
      turma: turma.trim() || 'T01',
      titulo: null,
      professor: professor.trim() || null,
      local: null,
      vagas: Math.max(0, Number(vagas) || 0),
      interessados: Math.max(0, Number(interessados) || 0),
      horarios: [...horarios].map((k) => {
        const [dia, slot] = k.split(':');
        return { dia: dia as Dia, slot: Number(slot) };
      }),
      atualizadaEm: null,
    });
    setAberto(false);
    setHorarios(new Set());
    setErro(null);
  };

  return (
    <form
      className={s.disciplina}
      style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
      onSubmit={enviar}
    >
      <div style={{ fontWeight: 600 }}>
        <Trans>Nova turma em {semestre}</Trans>
      </div>
      <div className={s.form}>
        <label className="ak-field">
          <Trans>Disciplina</Trans>
          <select
            className="ak-select ak-select--sm"
            value={disciplina}
            onChange={(e) => setDisciplina(e.target.value)}
          >
            {elegiveis.map((d) => (
              <option key={d.codigo} value={d.codigo}>
                {d.codigo} · {d.nome}
              </option>
            ))}
          </select>
        </label>
        <TextField size="sm" label={t`Turma`} value={turma} onChange={setTurma} />
        <TextField size="sm" label={t`Professor(a)`} value={professor} onChange={setProfessor} />
        <TextField
          size="sm"
          label={t`Vagas`}
          value={vagas}
          onChange={setVagas}
          inputMode="numeric"
        />
        <TextField
          size="sm"
          label={t`Interessados`}
          value={interessados}
          onChange={setInteressados}
          inputMode="numeric"
        />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="ak-small" style={{ fontWeight: 500, marginBottom: 6 }}>
          <Trans>Horários</Trans>
        </legend>
        <div className={s.horarios}>
          {instituicao.grade.dias.flatMap((dia) =>
            instituicao.grade.faixas.map((f, slot) => {
              const k = `${dia}:${slot}`;
              return (
                <Checkbox
                  key={k}
                  isSelected={horarios.has(k)}
                  onChange={(v) =>
                    setHorarios((x) => {
                      const n = new Set(x);
                      if (v) n.add(k);
                      else n.delete(k);
                      return n;
                    })
                  }
                >
                  {ROTULO_DIA[dia]} {rotuloFaixa(f)}
                </Checkbox>
              );
            }),
          )}
        </div>
      </fieldset>
      {erro && (
        <div role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
          {erro}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button type="submit" size="sm">
          <Trans>Salvar turma</Trans>
        </Button>
        <Button size="sm" variant="subtle" onPress={() => setAberto(false)}>
          <Trans>Cancelar</Trans>
        </Button>
      </div>
    </form>
  );
}
