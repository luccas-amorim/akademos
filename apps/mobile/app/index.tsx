import { Redirect } from 'expo-router';
import { useEstadoDados } from '../src/dados/store';

export default function Inicio() {
  const estado = useEstadoDados();
  const temDados = estado.fase === 'pronto' && estado.dados !== null;
  return <Redirect href={temDados ? '/inicio' : '/boas-vindas'} />;
}
