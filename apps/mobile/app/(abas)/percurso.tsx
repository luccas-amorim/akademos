import { notaDaDisciplina, semestreDoOrdinal, type SituacaoEfetiva } from '@akademos/core';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAnalise } from '../../src/dados/store';
import { Cartao, cores, e } from '../../src/tema';

const ESTILO: Record<SituacaoEfetiva, { rotulo: string; cor: string; fundo: string }> = {
  ok: { rotulo: 'Cursada', cor: cores.oliveInk, fundo: cores.oliveTint },
  cur: { rotulo: 'Cursando', cor: cores.primary, fundo: cores.primaryTint },
  pend: { rotulo: 'Adiada', cor: cores.amberInk, fundo: cores.amberTint },
  lib: { rotulo: 'Disponível', cor: cores.inkBody, fundo: cores.surface },
  blq: { rotulo: 'Bloqueada', cor: cores.ink3, fundo: cores.bg },
};

export default function Percurso() {
  const a = useAnalise();
  const [sel, setSel] = useState<string | null>(null);
  if (!a) return null;
  const { matriz, cursadas, aluno } = a.dados;
  const requisitos = (c: string) =>
    matriz.prerequisitos
      .filter((p) => p.disciplinaCodigo === c && p.tipo === 'pre')
      .map((p) => p.requerCodigo);
  const destrava = (c: string) =>
    matriz.prerequisitos.filter((p) => p.requerCodigo === c).map((p) => p.disciplinaCodigo);
  const nome = (c: string) => matriz.disciplinas.find((d) => d.codigo === c)?.nome ?? c;
  const total = Math.max(...matriz.disciplinas.map((d) => d.semestreSugerido));
  const selecionada = sel ? matriz.disciplinas.find((d) => d.codigo === sel) : null;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.rolagem}>
      <Text style={e.legenda}>
        Matriz {matriz.ano} · {matriz.creditosTotal} créditos · toque numa disciplina
      </Text>
      {selecionada && (
        <Cartao style={{ borderColor: cores.primary }}>
          <Text style={e.mono}>
            {selecionada.codigo} · {selecionada.area} · {selecionada.creditos} cr
          </Text>
          <Text style={e.h2}>{selecionada.nome}</Text>
          <Text style={[e.rotulo, { color: cores.olive }]}>Exige</Text>
          <Text style={e.corpo}>
            {requisitos(selecionada.codigo).map(nome).join(', ') || 'Nenhum pré-requisito.'}
          </Text>
          <Text style={[e.rotulo, { color: cores.amberInk }]}>Destrava</Text>
          <Text style={e.corpo}>
            {destrava(selecionada.codigo).map(nome).join(', ') || 'Não destrava nenhuma.'}
          </Text>
        </Cartao>
      )}
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <View key={n} style={{ gap: 8 }}>
          <Text style={[e.texto, { fontFamily: 'IBMPlexSans_600SemiBold' }]}>
            {n}º · {semestreDoOrdinal(aluno.ingresso, n)}
            {semestreDoOrdinal(aluno.ingresso, n) === a.semestreAtual ? ' · atual' : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {matriz.disciplinas
              .filter((d) => d.semestreSugerido === n)
              .map((d) => {
                const s = a.situacoes.get(d.codigo) ?? 'lib';
                const est = ESTILO[s];
                const papel = !sel
                  ? null
                  : d.codigo === sel
                    ? cores.primary
                    : requisitos(sel).includes(d.codigo)
                      ? cores.olive
                      : destrava(sel).includes(d.codigo)
                        ? cores.amber
                        : null;
                const nota = notaDaDisciplina(d.codigo, cursadas);
                return (
                  <Pressable
                    key={d.codigo}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.nome}, ${est.rotulo}`}
                    onPress={() => setSel(d.codigo === sel ? null : d.codigo)}
                    style={{
                      width: '48%',
                      minHeight: 70,
                      padding: 8,
                      borderRadius: 7,
                      backgroundColor: est.fundo,
                      borderWidth: papel ? 2 : 1,
                      borderColor: papel ?? est.cor,
                      borderStyle: s === 'blq' && !papel ? 'dashed' : 'solid',
                      gap: 2,
                    }}
                  >
                    <View style={[e.linha, { justifyContent: 'space-between' }]}>
                      <Text style={[e.mono, { fontSize: 10, color: est.cor }]}>{d.codigo}</Text>
                      <Text style={[e.mono, { fontSize: 10, color: est.cor }]}>
                        {nota !== null ? nota.toFixed(1).replace('.', ',') : ''}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'IBMPlexSans_500Medium',
                        fontSize: 12.5,
                        color: cores.ink,
                      }}
                    >
                      {d.nome}
                    </Text>
                    {s !== 'ok' && (
                      <Text
                        style={{
                          fontFamily: 'IBMPlexSans_600SemiBold',
                          fontSize: 10.5,
                          color: est.cor,
                        }}
                      >
                        {est.rotulo}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
