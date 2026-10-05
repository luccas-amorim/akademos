import { descreverHorarios, formatarIntervalo, formatarNota, normalizarNota } from '@akademos/core';
import { ScrollView, Text, View } from 'react-native';
import { CartaoInsight } from '../../src/CartaoInsight';
import { useAnalise } from '../../src/dados/store';
import { Barra, Cartao, cores, e, Kpi } from '../../src/tema';

const COR_RISCO = { baixo: cores.oliveInk, moderado: cores.amberInk, alto: cores.danger } as const;
const ROTULO_RISCO = { baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto' } as const;

export default function Inicio() {
  const a = useAnalise();
  if (!a) return null;
  const { dados, integralizacao: integ } = a;
  const nome = dados.aluno.nome.split(' ')[0];
  const h = a.agora.getHours();
  const saudacao =
    h < 12 ? `Bom dia, ${nome}.` : h < 18 ? `Boa tarde, ${nome}.` : `Boa noite, ${nome}.`;
  const cursando = dados.cursadas.filter(
    (c) => c.situacao === 'cursando' && c.semestre === a.semestreAtual,
  );

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.rolagem}>
      <Text style={e.legenda}>
        {new Intl.DateTimeFormat('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(a.agora)}
      </Text>
      <Text style={e.h1}>{saudacao}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Kpi
          rotulo="Integralizado"
          valor={`${integ.percentual}%`}
          progresso={integ.percentual}
          legenda={`${integ.creditosCumpridos} de ${integ.creditosTotal} créditos`}
        />
        <Kpi
          rotulo="Média"
          valor={formatarNota(a.media)}
          progresso={a.media === null ? 0 : normalizarNota(a.media, dados.escala) * 10}
          legenda={`aprovação ≥ ${formatarNota(dados.escala.aprovacao)}`}
        />
        <Kpi rotulo="Formatura" valor={a.formatura.formatura ?? '—'} legenda="prevista" />
        <Kpi
          rotulo="Esta semana"
          valor={`${a.horasSemanaAtual} h`}
          progresso={(a.horasSemanaAtual / 25) * 100}
        />
      </View>

      <Text style={e.h2}>O que merece atenção</Text>
      {a.insights.slice(0, 3).map((i) => (
        <CartaoInsight key={i.id} insight={i} />
      ))}

      <Text style={e.h2}>Este semestre</Text>
      <Cartao style={{ padding: 0, gap: 0 }}>
        {cursando.map((c, idx) => {
          const d = dados.matriz.disciplinas.find((x) => x.codigo === c.disciplinaCodigo);
          const p = a.previsoes.get(c.disciplinaCodigo);
          const turma = a.turmasAtuais.find((o) => o.disciplinaCodigo === c.disciplinaCodigo);
          return (
            <View
              key={c.id}
              style={{
                padding: 12,
                gap: 2,
                borderTopWidth: idx ? 1 : 0,
                borderTopColor: cores.borderSoft,
              }}
            >
              <View style={[e.linha, { justifyContent: 'space-between' }]}>
                <Text style={[e.texto, { fontFamily: 'IBMPlexSans_500Medium', flex: 1 }]}>
                  {d?.nome}
                </Text>
                {p && (
                  <Text
                    style={{
                      fontFamily: 'IBMPlexSans_600SemiBold',
                      fontSize: 12,
                      color: COR_RISCO[p.nivel],
                    }}
                  >
                    {ROTULO_RISCO[p.nivel]}
                  </Text>
                )}
              </View>
              <Text style={e.legenda}>
                {c.disciplinaCodigo}
                {turma ? ` · ${descreverHorarios(turma.horarios, dados.instituicao.grade)}` : ''}
                {p ? ` · prevista ${formatarIntervalo(p.intervalo)}` : ''}
              </Text>
            </View>
          );
        })}
      </Cartao>

      <Text style={e.h2}>Por área</Text>
      <Cartao style={{ gap: 10 }}>
        {a.progressoArea.map((p) => (
          <View key={p.area} style={{ gap: 4 }}>
            <View style={[e.linha, { justifyContent: 'space-between' }]}>
              <Text style={e.corpo}>{p.area}</Text>
              <Text style={e.mono}>
                {p.creditosCumpridos}/{p.creditosTotal} cr
              </Text>
            </View>
            <Barra
              valor={(p.creditosCumpridos / p.creditosTotal) * 100}
              cor={cores.olive}
              altura={6}
            />
          </View>
        ))}
      </Cartao>
    </ScrollView>
  );
}
