import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChildrenProvider } from '../contexts/ChildrenContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ChildrenProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="child/[id]/index" />
              <Stack.Screen name="child/[id]/flashcards" />
              <Stack.Screen name="child/[id]/word-pop" />
              <Stack.Screen name="child/[id]/lava-letters" />
              <Stack.Screen name="child/[id]/books" />
              <Stack.Screen name="child/[id]/library" />
              <Stack.Screen name="child/[id]/upload" />
            </Stack>
            <StatusBar style="auto" />
          </ChildrenProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});