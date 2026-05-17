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

function getBaseUrlFromHostUri(hostUri: string) {
  const normalizedHostUri = hostUri.trim();

  if (!normalizedHostUri) {
    return null;
  }

  if (/^https?:\/\//.test(normalizedHostUri)) {
    try {
      const url = new URL(normalizedHostUri);
      return `${url.protocol}//${url.host}`;
    } catch {
      return null;
    }
  }

  const host = normalizedHostUri.replace(/^exp:\/\//, '').split('/')[0];

  if (!host) {
    return null;
  }

  if (host.endsWith('.exp.direct')) {
    return `https://${host}`;
  }

  return `http://${host}`;
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

  return getBaseUrlFromHostUri(hostUri);
}

export function getApiRequestUrl(path: string) {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return `${trimTrailingSlash(configuredBaseUrl)}${path}`;
  }

  if (Platform.OS === 'web') {
    return path;
  }

  const apiBaseUrl = getApiBaseUrl();

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}
