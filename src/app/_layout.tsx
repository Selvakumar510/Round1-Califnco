import { Stack } from 'expo-router';
import { DemoStateProvider } from '../DemoState';

export default function RootLayout() {
  return (
    <DemoStateProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DemoStateProvider>
  );
}
