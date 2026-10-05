import { Tabs } from 'expo-router';
import { useAnalise } from '../../src/dados/store';
import { cores, fontes } from '../../src/tema';

export default function Abas() {
  const a = useAnalise();
  const urgentes = a?.insights.filter((i) => i.severidade === 'alta').length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.surface },
        headerTitleStyle: { fontFamily: fontes.serif, color: cores.ink },
        tabBarActiveTintColor: cores.primary,
        tabBarInactiveTintColor: cores.ink2,
        tabBarStyle: { backgroundColor: cores.surface, borderTopColor: cores.border },
        tabBarLabelStyle: { fontFamily: fontes.sansMedia, fontSize: 12 },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: 'Início' }} />
      <Tabs.Screen name="percurso" options={{ title: 'Percurso' }} />
      <Tabs.Screen
        name="planejar"
        options={{ title: a ? `Planejar ${a.proximoSemestre}` : 'Planejar' }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarBadge: urgentes || undefined,
          tabBarBadgeStyle: { backgroundColor: cores.amber },
        }}
      />
    </Tabs>
  );
}
