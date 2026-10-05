import {
  alternarTurma,
  chanceDeVaga,
  descreverHorarios,
  resumirPlano,
  ROTULO_DIA,
} from '@akademos/core';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { lerDataDoPrazo } from '../../src/datas';
import { agendarPrazoDeMatricula } from '../../src/notificacoes';
import { store, useAnalise } from '../../src/dados/store';
import { Barra, Botao, Cartao, cores, e, fontes, Kpi } from '../../src/tema';

export default function Planejar() {
  const a = useAnalise();
  const [prazo, setPrazo] = useState('');
  const [avisoPrazo, setAvisoPrazo] = useState<string | null>(null);
  if (!a) return null;
  const { dados, proximoSemestre: semestre } = a;
  const ofertas = dados.ofertas.filter((o) => o.semestre === semestre);
  const plano = dados.planos.find((p) => p.semestre === semestre);
  const escolhidas = new Set(plano?.turmas ?? []);
  const turmas = ofertas.filter((o) => escolhidas.has(o.id));
  const r = resumirPlano({
    matriz: dados.matriz,
    instituicao: dados.instituicao,
    cursadas: dados.cursadas,
    semestreAtual: a.semestreAtual,
    turmas,
  });
  const atrasou = r.formatura && r.formaturaIdeal && r.formatura > r.formaturaIdeal;
  const nome = (c: string) => dados.matriz.disciplinas.find((d) => d.codigo === c)?.nome ?? c;
  const disponiveis = [...new Set(ofertas.map((o) => o.disciplinaCodigo))].filter((c) =>
    a.ctx.elegivel(c),
  );

  const alternar = (id: string) =>
    void store.escrever((repos) =>
      repos.planos.salvar({
        id: plano?.id ?? randomUUID(),
        alunoId: dados.aluno.id,
        semestre,
        turmas: alternarTurma([...escolhidas], id, ofertas),
        criadoEm: plano?.criadoEm ?? new Date().toISOString(),
      }),
    );

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.rolagem}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi rotulo="Créditos" valor={String(r.creditos)} />
        <Kpi rotulo="Horas" valor={`${r.horas} h`} />
        <Kpi
          rotulo="Conflitos"
          valor={String(r.conflitos.length)}
          cor={r.conflitos.length ? cores.danger : cores.oliveInk}
        />
        <Kpi
          rotulo="Formatura"
          valor={r.formatura ?? '—'}
          cor={atrasou ? cores.danger : cores.oliveInk}
        />
      </View>
      {r.conflitos.map((c) => (
        <View
          key={`${c.dia}${c.slot}`}
          style={{ backgroundColor: cores.dangerTint, padding: 10, borderRadius: 8 }}
        >
          <Text style={[e.corpo, { color: cores.dangerInk }]}>
            Conflito {ROTULO_DIA[c.dia]} {dados.instituicao.grade.faixas[c.slot]?.inicio}:{' '}
            {c.ofertas.map((o) => nome(o.disciplinaCodigo)).join(' × ')}
          </Text>
        </View>
      ))}
      {atrasou && (
        <View style={{ backgroundColor: cores.dangerTint, padding: 10, borderRadius: 8 }}>
          <Text style={[e.corpo, { color: cores.dangerInk }]}>
            Com este plano, a formatura fica em {r.formatura}; o melhor possível é{' '}
            {r.formaturaIdeal}.
          </Text>
        </View>
      )}
      <Text style={e.h2}>Disponíveis para você</Text>
      {!ofertas.length && (
        <Text style={e.corpo}>Ainda não há turmas de {semestre} neste aparelho.</Text>
      )}
      {disponiveis.map((codigo) => (
        <Cartao key={codigo} style={{ padding: 0, gap: 0 }}>
          <Text style={[e.texto, { fontFamily: 'IBMPlexSans_600SemiBold', padding: 12 }]}>
            {nome(codigo)}
          </Text>
          {ofertas
            .filter((o) => o.disciplinaCodigo === codigo)
            .map((o) => {
              const na = escolhidas.has(o.id);
              const chance = chanceDeVaga(o);
              return (
                <View
                  key={o.id}
                  style={{
                    padding: 12,
                    gap: 6,
                    borderTopWidth: 1,
                    borderTopColor: cores.borderSoft,
                    backgroundColor: na ? cores.primaryTintSoft : undefined,
                  }}
                >
                  <Text style={[e.corpo, { fontFamily: 'IBMPlexSans_500Medium' }]}>
                    {o.titulo ?? o.turma} · {descreverHorarios(o.horarios, dados.instituicao.grade)}
                  </Text>
                  <Barra
                    valor={(o.interessados / Math.max(1, o.vagas)) * 100}
                    cor={o.interessados > o.vagas ? cores.danger : cores.primary}
                    altura={6}
                  />
                  <View style={[e.linha, { justifyContent: 'space-between' }]}>
                    <Text style={e.legenda}>
                      {o.interessados}/{o.vagas} · {chance}% de vaga
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: na }}
                      onPress={() => alternar(o.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: cores.primary,
                        borderRadius: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        backgroundColor: na ? cores.primary : cores.surface,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'IBMPlexSans_500Medium',
                          fontSize: 12.5,
                          color: na ? '#fff' : cores.primary,
                        }}
                      >
                        {na ? 'Na grade ✓' : 'Adicionar'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
        </Cartao>
      ))}
      <Cartao>
        <Text style={e.rotulo}>Prazo da matrícula</Text>
        <Text style={e.corpo}>O celular avisa na véspera e no dia (notificação local).</Text>
        <TextInput
          value={prazo}
          onChangeText={setPrazo}
          placeholder="DD/MM/AAAA"
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Data do fim da matrícula"
          style={{
            fontFamily: fontes.sans,
            fontSize: 15,
            borderWidth: 1,
            borderColor: cores.inputBorder,
            borderRadius: 8,
            padding: 10,
            backgroundColor: cores.surface,
          }}
        />
        <Botao
          titulo="Lembrar do prazo"
          variante="contorno"
          aoTocar={() => {
            const data = lerDataDoPrazo(prazo);
            if (!data) return setAvisoPrazo('Use uma data futura no formato DD/MM/AAAA.');
            void agendarPrazoDeMatricula(data, semestre).then((ids) =>
              setAvisoPrazo(
                ids.length
                  ? 'Lembrete agendado.'
                  : 'Permita notificações nas configurações do sistema.',
              ),
            );
          }}
        />
        {avisoPrazo && <Text style={e.legenda}>{avisoPrazo}</Text>}
      </Cartao>
    </ScrollView>
  );
}
