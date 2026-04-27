import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ConstantsWithManifest = typeof Constants & {
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
};

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  const constants = Constants as ConstantsWithManifest;
  const expoConfigHost = (constants.expoConfig as { hostUri?: string } | null)?.hostUri;
  const hostUri = expoConfigHost ?? constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.replace(/^https?:\/\//, '').replace(/^exp:\/\//, '').split('/')[0];

  if (!host) {
    return null;
  }

  return `http://${host}`;
}
