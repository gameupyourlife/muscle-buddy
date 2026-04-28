import { Redirect, type Href } from 'expo-router';

export default function Index() {
  // Route groups don't appear in URL — this resolves to the (home) tab's index.
  const href = '/(tabs)/(home)' as unknown as Href;
  return <Redirect href={href} />;
}
