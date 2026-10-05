import type { Insight } from '@akademos/core';
import { Text, View } from 'react-native';
import { Cartao, cores, e } from './tema';

const COR: Record<Insight['tipo'], string> = {
  risco: cores.danger,
  lotacao: cores.amberInk,
  carreira: cores.primary,
  correlacao: cores.olive,
  carga: cores.inkBody,
};

const FONTE = { pessoal: 'Seus dados', comunidade: 'Comunidade', regra: 'Regra' } as const;

/** Todo insight mostra motivo e fonte (regra 5 do CLAUDE.md). */
export function CartaoInsight({ insight: i }: { insight: Insight }) {
  return (
    <Cartao>
      <Text style={[e.rotulo, { color: COR[i.tipo] }]}>{i.rotulo}</Text>
      <Text style={[e.texto, { fontFamily: 'IBMPlexSans_600SemiBold' }]}>{i.titulo}</Text>
      <Text style={e.corpo}>{i.texto}</Text>
      <View>
        <Text style={[e.legenda, { color: cores.ink3 }]}>
          {FONTE[i.fonte]} · {i.motivo}
        </Text>
      </View>
    </Cartao>
  );
}
