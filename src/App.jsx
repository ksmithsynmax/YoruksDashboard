
import { useState } from 'react';
import { MantineProvider, AppShell, Container, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import { IntelligenceOverview } from './pages/IntelligenceOverview';
import { GrainRiskAssessment } from './pages/GrainRiskAssessment';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: "'Inter', -apple-system, sans-serif",
  colors: {
    dark: [
      '#C1C2C5', '#A6A7AB', '#888f9e', '#5c5f66',
      '#373A40', '#2C2E33', '#24263C', '#141517',
      '#181926', '#0a0e17',
    ],
  },
});

export default function App() {
  const [activeTab, setActiveTab] = useState('intelligence');

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AppShell styles={{ main: { background: '#181926' } }}>
        <AppShell.Main>
          <Container size="xl" py={8}>
            {activeTab === 'intelligence' && (
              <IntelligenceOverview activeTab={activeTab} onTabChange={setActiveTab} />
            )}
            {activeTab === 'grain' && (
              <GrainRiskAssessment activeTab={activeTab} onTabChange={setActiveTab} />
            )}
          </Container>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
