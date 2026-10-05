/**
 * Tokens do docs/DESIGN.md (mesma fonte do app web: @akademos/ui/tokens) e
 * componentes básicos em React Native.
 */
import { cores, raios } from '@akademos/ui/tokens';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export { cores };

export const fontes = {
  serif: 'SourceSerif4_600SemiBold',
  sans: 'IBMPlexSans_400Regular',
  sansMedia: 'IBMPlexSans_500Medium',
  sansForte: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
} as const;

export const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.bg },
  rolagem: { padding: 16, gap: 16, paddingBottom: 40 },
  h1: { fontFamily: fontes.serif, fontSize: 28, color: cores.ink, letterSpacing: -0.4 },
  h2: { fontFamily: fontes.serif, fontSize: 19, color: cores.ink },
  texto: { fontFamily: fontes.sans, fontSize: 15, color: cores.ink, lineHeight: 21 },
  corpo: { fontFamily: fontes.sans, fontSize: 14, color: cores.inkBody, lineHeight: 20 },
  legenda: { fontFamily: fontes.sans, fontSize: 12.5, color: cores.ink2 },
  rotulo: {
    fontFamily: fontes.sansForte,
    fontSize: 11,
    color: cores.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.66,
  },
  mono: { fontFamily: fontes.mono, fontSize: 12, color: cores.ink2 },
  cartao: {
    backgroundColor: cores.surface,
    borderColor: cores.border,
    borderWidth: 1,
    borderRadius: raios.card,
    padding: 14,
    gap: 6,
  },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[e.cartao, style]}>{children}</View>;
}

export function Barra({
  valor,
  cor = cores.primary,
  altura = 4,
}: {
  valor: number;
  cor?: string;
  altura?: number;
}) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}
      style={{
        height: altura,
        backgroundColor: cores.borderSoft,
        borderRadius: altura / 2,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${v}%`, height: '100%', backgroundColor: cor }} />
    </View>
  );
}

export function Kpi({
  rotulo,
  valor,
  progresso,
  legenda,
  cor,
}: {
  rotulo: string;
  valor: string;
  progresso?: number;
  legenda?: string;
  cor?: string;
}) {
  return (
    <Cartao style={{ flexBasis: '47%', flexGrow: 1 }}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <Text style={{ fontFamily: fontes.serif, fontSize: 26, color: cor ?? cores.ink }}>
        {valor}
      </Text>
      {progresso !== undefined && <Barra valor={progresso} />}
      {legenda ? <Text style={e.legenda}>{legenda}</Text> : null}
    </Cartao>
  );
}

export function Botao({
  titulo,
  aoTocar,
  variante = 'primario',
  desativado,
  estilo,
}: {
  titulo: string;
  aoTocar: () => void;
  variante?: 'primario' | 'contorno' | 'escuro' | 'link';
  desativado?: boolean;
  estilo?: StyleProp<ViewStyle>;
}) {
  const fundo: Record<typeof variante, string> = {
    primario: cores.primary,
    escuro: cores.ink,
    contorno: cores.surface,
    link: 'transparent',
  };
  const cor: TextStyle['color'] =
    variante === 'contorno' || variante === 'link' ? cores.primary : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!desativado }}
      disabled={desativado}
      onPress={aoTocar}
      style={({ pressed }) => [
        {
          backgroundColor: fundo[variante],
          borderColor: variante === 'contorno' ? cores.primary : 'transparent',
          borderWidth: variante === 'contorno' ? 1 : 0,
          borderRadius: raios.controle,
          paddingVertical: variante === 'link' ? 4 : 12,
          paddingHorizontal: variante === 'link' ? 0 : 14,
          alignItems: variante === 'link' ? 'flex-start' : 'center',
          opacity: desativado ? 0.5 : pressed ? 0.85 : 1,
        },
        estilo,
      ]}
    >
      <Text style={{ fontFamily: fontes.sansMedia, fontSize: 14.5, color: cor }}>{titulo}</Text>
    </Pressable>
  );
}
