import './global.css'; 

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from './src/navigation/AuthNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import { LanguageProvider } from './src/context/LanguageContext';

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <LanguageProvider>
        {/* Global: translucent so content draws under the status bar on Android */}
        <StatusBar style="auto" translucent backgroundColor="transparent" />
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
        </LanguageProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
