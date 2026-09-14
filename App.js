import './global.css'; // Required by NativeWind v4 — must be the first import

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthNavigator from './src/navigation/AuthNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppProvider } from './src/context/AppContext';
import { LanguageProvider } from './src/context/LanguageContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <LanguageProvider>
            <StatusBar style="auto" />
            <NavigationBar style="auto" hidden={false} />
            <NavigationContainer>
              <AuthNavigator />
            </NavigationContainer>
          </LanguageProvider>
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
