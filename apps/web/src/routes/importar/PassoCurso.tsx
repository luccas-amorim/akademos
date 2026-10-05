import { deslocarSemestre, semestreDaData, type Aluno } from '@akademos/core';
import { Button, TextField } from '@akademos/ui';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { definirCurso } from '../../dados/acoes';
import { CATALOGO } from '../../dados/catalogo';
import s from './importar.module.css';

export function PassoCurso({
  aluno,
  aoConcluir,
  aoExplorar,
}: {
  aluno: Aluno | null;
  aoConcluir: () => void;
  aoExplorar: () => void;
}) {
  const { t } = useLingui();
  const atual = semestreDaData(new Date());
  const semestres = Array.from({ length: 21 }, (_, i) => deslocarSemestre(atual, -i));
  const [matrizId, setMatrizId] = useState(aluno?.matrizId ?? CATALOGO[0]?.pacote.matriz.id ?? '');
  const [nome, setNome] = useState(aluno?.nome ?? '');
  const [ingresso, setIngresso] = useState(aluno?.ingresso ?? deslocarSemestre(atual, -2));
  const [matricula, setMatricula] = useState(aluno?.matricula ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const entrada = CATALOGO.find((x) => x.pacote.matriz.id === matrizId);
    if (!entrada || !nome.trim()) {
      setErro(t`Escolha o curso e diga como quer ser chamada(o).`);
      return;
    }
    setSalvando(true);
    try {
      await definirCurso({ pacote: entrada.pacote, nome, ingresso, matricula }, aluno);
      aoConcluir();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form className={s.painel} onSubmit={enviar}>
      <div style={{ fontWeight: 600 }}>
        <Trans>Seu curso</Trans>
      </div>
      <div className="ak-small ak-muted">
        <Trans>
          A matriz vem do registro aberto do Akademos, mantido pela comunidade. Nada disso sai deste
          aparelho.
        </Trans>
      </div>
      <label className="ak-field">
        <Trans>Instituição, curso e matriz</Trans>
        <select
          className="ak-select"
          value={matrizId}
          onChange={(e) => setMatrizId(e.target.value)}
        >
          {CATALOGO.map(({ pacote: p, ficticia }) => (
            <option key={p.matriz.id} value={p.matriz.id}>
              {p.instituicao.nome} · {p.curso.nome} · {t`matriz ${p.matriz.ano}`}
              {ficticia ? ` (${t`fictícia`})` : ''}
            </option>
          ))}
        </select>
      </label>
      <div className={s.formulario}>
        <TextField
          label={t`Nome`}
          placeholder={t`Como quer ser chamada(o)`}
          value={nome}
          onChange={setNome}
          isRequired
        />
        <label className="ak-field">
          <Trans>Ingresso</Trans>
          <select
            className="ak-select"
            value={ingresso}
            onChange={(e) => setIngresso(e.target.value)}
          >
            {semestres.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </label>
        <TextField label={t`Matrícula (opcional)`} value={matricula} onChange={setMatricula} />
      </div>
      {erro && (
        <div className={s.erro} role="alert">
          {erro}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button type="submit" isDisabled={salvando}>
          {aluno ? <Trans>Salvar curso</Trans> : <Trans>Continuar</Trans>}
        </Button>
        {!aluno && (
          <Button variant="link" onPress={aoExplorar}>
            <Trans>Só quero explorar: carregar a aluna de exemplo (fictícia) →</Trans>
          </Button>
        )}
      </div>
      <div className="ak-caption">
        <Trans>
          Seu curso não está na lista? A matriz é um arquivo YAML no registro; veja o guia de
          contribuição no GitHub.
        </Trans>
      </div>
    </form>
  );
}
