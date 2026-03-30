import { Redirect } from 'expo-router';
import { useApp } from '@/hooks/useApp';
import { getInitialRoute } from '@/utils/onboarding';

export default function Index() {
  const { settings } = useApp();

  return <Redirect href={getInitialRoute(settings)} />;
}
