import { ClienteRelay, conferirVerificador, deBase64, derivarChave } from '@akademos/sync';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL, guardarCredenciaisDeSync, sincronizarAgora } from '../src/sincronizacao';
import { Botao, cores, e, fontes } from '../src/tema';

const campo = {
  fontFamily: fontes.sans,
  fontSize: 15,
  borderWidth: 1,
  borderColor: cores.inputBorder,
  borderRadius: 8,
  padding: 12,
  backgroundColor: cores.surface,
  color: cores.ink,
} as const;

/**
 * Entrar neste celular com uma conta criada na web ou no desktop: e-mail e
 * senha, depois a frase de recuperação para derivar a chave aqui.
 */
export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [frase, setFrase] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    if (!API_URL) return;
    setErro(null);
    setOcupado(true);
    try {
      const r = await fetch(`${API_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      });
      const token = r.headers.get('set-auth-token');
      if (!r.ok || !token) throw new Error('E-mail ou senha não conferem.');
      const chaveDaConta = await new ClienteRelay({
        url: API_URL,
        token: () => token,
      }).obterChave();
      if (!chaveDaConta)
        throw new Error('Esta conta ainda não sincronizou. Termine o cadastro na web.');
      const chave = await derivarChave(frase, await deBase64(chaveDaConta.sal));
      if (!(await conferirVerificador(chave, await deBase64(chaveDaConta.verificador)))) {
        throw new Error('A frase não confere com a desta conta.');
      }
      await guardarCredenciaisDeSync(token, chave);
      await sincronizarAgora();
      router.replace('/');
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <SafeAreaView style={e.tela}>
      <View style={{ padding: 20, gap: 14 }}>
        <Text style={e.h1}>Entrar</Text>
        {!API_URL ? (
          <Text style={e.corpo}>
            Este build não tem servidor de sincronização configurado (EXPO_PUBLIC_API_URL). Use o
            app sem conta.
          </Text>
        ) : (
          <>
            <TextInput
              style={campo}
              placeholder="E-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="E-mail"
            />
            <TextInput
              style={campo}
              placeholder="Senha"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
              accessibilityLabel="Senha"
            />
            <TextInput
              style={[campo, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="Frase de recuperação (12 palavras)"
              autoCapitalize="none"
              multiline
              value={frase}
              onChangeText={setFrase}
              accessibilityLabel="Frase de recuperação"
            />
            {erro && <Text style={[e.corpo, { color: cores.danger }]}>{erro}</Text>}
            <Botao
              titulo={ocupado ? 'Conferindo…' : 'Entrar e sincronizar'}
              desativado={ocupado}
              aoTocar={() => void entrar()}
            />
          </>
        )}
        <Botao titulo="Voltar" variante="link" aoTocar={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
