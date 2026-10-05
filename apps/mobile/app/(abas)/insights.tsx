import type { TipoInsight } from '@akademos/core';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CartaoInsight } from '../../src/CartaoInsight';
import { useAnalise } from '../../src/dados/store';
import { cores, e } from '../../src/tema';

type Filtro = 'todos' | TipoInsight;
const FILTROS: Array<[Filtro, string]> = [
  ['todos', 'Todos'],
  ['risco', 'Risco'],
  ['lotacao', 'Lotação'],
  ['correlacao', 'Correlação'],
  ['carga', 'Carga'],
  ['carreira', 'Carreira'],
];

export default function Insights() {
  const a = useAnalise();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  if (!a) return null;
  const lista = a.insights.filter((i) => filtro === 'todos' || i.tipo === filtro);
  return (
    <ScrollView style={e.tela} contentContainerStyle={e.rolagem}>
      <Text style={e.corpo}>
        Calculados no seu aparelho. Comparações com a comunidade usam só históricos anônimos de quem
        optou por compartilhar.
      </Text>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
        accessibilityRole="radiogroup"
      >
        {FILTROS.map(([id, rotulo]) => {
          const ativo = filtro === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: ativo }}
              onPress={() => setFiltro(id)}
              style={{
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: ativo ? cores.ink : cores.border,
                backgroundColor: ativo ? cores.ink : cores.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: 'IBMPlexSans_400Regular',
                  fontSize: 13,
                  color: ativo ? '#fff' : cores.ink,
                }}
              >
                {rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {lista.map((i) => (
        <CartaoInsight key={i.id} insight={i} />
      ))}
      {!lista.length && <Text style={e.corpo}>Nenhum insight deste tipo agora.</Text>}
    </ScrollView>
  );
}
