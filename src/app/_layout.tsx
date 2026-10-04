import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, ThemeProvider, Stack, SplashScreen, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setupNotifications, startNotificationService } from '../lib/notifications';
import { getState, hydrate, useHydrated } from '../lib/store';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.violet, text: colors.text },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useHydrated();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let stop = () => {};
    setupNotifications()
      .catch(() => {})
      .finally(() => {
        stop = startNotificationService();
      });
    return () => stop();
  }, [hydrated]);

  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    if (!getState().settings.onboarded) router.push('/welcome');
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {/* Bilgisayarda (web) uygulama ortada telefon genişliğinde bir sütun olarak görünür */}
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' } : { flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="assistant" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="task" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
            </Stack>
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
