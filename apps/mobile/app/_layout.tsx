import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configurarNotificacoes } from '../src/notificacoes';
import { sincronizarAgora } from '../src/sincronizacao';
import { store, useEstadoDados } from '../src/dados/store';
import { cores, e } from '../src/tema';

export default function Raiz() {
  const [fontes] = useFonts({
    SourceSerif4_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
  });
  const estado = useEstadoDados();

  useEffect(() => {
    void configurarNotificacoes();
    let espera: ReturnType<typeof setTimeout> | null = null;
    const sincronizar = () => void sincronizarAgora().catch(() => null);
    void store.iniciar().then(sincronizar);
    // Sincroniza ao voltar para o app e logo depois de cada escrita local.
    const assinatura = AppState.addEventListener('change', (s) => s === 'active' && sincronizar());
    const desfazer = store.aoEscrever(() => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(sincronizar, 2000);
    });
    return () => {
      assinatura.remove();
      desfazer();
    };
  }, []);

  if (!fontes || estado.fase === 'abrindo') {
    return (
      <View style={[e.tela, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={cores.primary} />
      </View>
    );
  }
  if (estado.fase === 'erro') {
    return (
      <View style={[e.tela, { padding: 24, justifyContent: 'center', gap: 8 }]}>
        <Text style={e.h2}>Não foi possível abrir os dados locais</Text>
        <Text style={e.corpo}>{estado.mensagem}</Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.bg },
        }}
      />
    </SafeAreaProvider>
  );
}
