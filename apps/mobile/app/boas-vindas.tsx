import { semearAna, MATRIZ_DA_ANA } from '@akademos/db/seed';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { entradaDaMatriz } from '../src/dados/catalogo';
import { store } from '../src/dados/store';
import { Botao, cores, e, fontes } from '../src/tema';

export default function BoasVindas() {
  const [ocupado, setOcupado] = useState(false);
  const explorar = async () => {
    setOcupado(true);
    const entrada = entradaDaMatriz(MATRIZ_DA_ANA);
    if (entrada) await store.escrever((repos) => semearAna(repos, entrada.pacote));
    setOcupado(false);
    router.replace('/inicio');
  };
  return (
    <SafeAreaView style={[e.tela, { backgroundColor: cores.primary }]}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fontes.serif, fontSize: 22, color: cores.bg }}>Akademos</Text>
        <View style={{ gap: 14 }}>
          <Text style={{ fontFamily: fontes.serif, fontSize: 34, color: cores.bg, lineHeight: 38 }}>
            Seu percurso acadêmico, do primeiro semestre à formatura.
          </Text>
          <Text
            style={{
              fontFamily: fontes.sans,
              fontSize: 15,
              color: cores.primaryOnDark,
              lineHeight: 22,
            }}
          >
            Histórico, planejamento de matrícula e previsões calculadas no seu aparelho. Seus dados
            não saem dele sem você pedir.
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          <Botao
            titulo="Entrar para sincronizar"
            variante="escuro"
            aoTocar={() => router.push('/entrar')}
          />
          <Botao
            titulo={ocupado ? 'Carregando…' : 'Explorar com a aluna de exemplo'}
            variante="contorno"
            desativado={ocupado}
            aoTocar={() => void explorar()}
          />
          <Text style={{ fontFamily: fontes.sans, fontSize: 12.5, color: cores.primaryOnDark }}>
            Para trazer seu histórico, use o app web ou de desktop e sincronize: a conta leva tudo,
            cifrado, para este celular.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
