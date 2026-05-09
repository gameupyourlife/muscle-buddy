import { getApiBaseUrl } from '@/lib/api/base-url';
import { authClient } from '@/lib/auth-client';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

export type SocialProfile = {
  userId: string;
  experienceLevel: string;
  trainingGoals: string;
  preferredDays: string;
  preferredTimeWindows: string;
  genderPreference: string;
  gymDistrict: string;
  city: string;
  language: string;
  bio: string | null;
  isDiscoverable: boolean;
  isPrivateProfile: boolean;
  searchRadiusKm: number;
  areaLatE5: number | null;
  areaLngE5: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialUserPreview = {
  userId: string;
  displayName: string;
  image: string | null;
};

export type BuddyRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fromProfile: SocialUserPreview | null;
  toProfile: SocialUserPreview | null;
};

export type BuddySummary = {
  id: string;
  buddyUserId: string;
  connectedAt: string;
  preview: SocialUserPreview | null;
  profile: SocialProfile | null;
};

export type DiscoverBuddy = {
  profile: SocialProfile;
  preview: SocialUserPreview | null;
};

export type SocialMessage = {
  id: string;
  buddyId: string;
  senderUserId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type SocialNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
};

export type SocialMeetupInvite = {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  startsAt: string;
  endsAt: string;
  gymArea: string;
  note: string | null;
  status: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  senderProfile: SocialUserPreview | null;
  receiverProfile: SocialUserPreview | null;
};

export type DiscoverFilters = {
  radiusKm: number;
  goals: string[];
  experienceLevel: string;
  preferredDays: string[];
  district: string;
  language: string;
};

export const SOCIAL_GOAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'weight-loss', label: 'Weight Loss' },
  { value: 'endurance', label: 'Endurance' },
];

export const SOCIAL_EXPERIENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const SOCIAL_DAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

const SOCIAL_FOCUS_REFRESH_COOLDOWN_MS = 45_000;

type SocialCacheSnapshot = {
  profile: SocialProfile | null;
  discoverResults: DiscoverBuddy[];
  incomingRequests: BuddyRequest[];
  outgoingRequests: BuddyRequest[];
  buddies: BuddySummary[];
  meetupIncoming: SocialMeetupInvite[];
  meetupOutgoing: SocialMeetupInvite[];
  notifications: SocialNotification[];
  cachedAt: number;
};

type LoadSocialOptions = {
  force?: boolean;
  silent?: boolean;
};

type RefreshDiscoverOptions = {
  silent?: boolean;
};

let socialCache: SocialCacheSnapshot | null = null;
let socialLoadPromise: Promise<void> | null = null;

function updateSocialCache(
  patch: Partial<Omit<SocialCacheSnapshot, 'cachedAt'>>
) {
  const nextCache: SocialCacheSnapshot = {
    profile: patch.profile ?? socialCache?.profile ?? null,
    discoverResults: patch.discoverResults ?? socialCache?.discoverResults ?? [],
    incomingRequests: patch.incomingRequests ?? socialCache?.incomingRequests ?? [],
    outgoingRequests: patch.outgoingRequests ?? socialCache?.outgoingRequests ?? [],
    buddies: patch.buddies ?? socialCache?.buddies ?? [],
    meetupIncoming: patch.meetupIncoming ?? socialCache?.meetupIncoming ?? [],
    meetupOutgoing: patch.meetupOutgoing ?? socialCache?.meetupOutgoing ?? [],
    notifications: patch.notifications ?? socialCache?.notifications ?? [],
    cachedAt: Date.now(),
  };

  socialCache = nextCache;
  return nextCache.cachedAt;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fallback;
}

function toCsv(values: string[]) {
  return values.map((entry) => entry.trim()).filter((entry) => entry.length > 0).join(',');
}

async function resolveCurrentAreaE5() {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if (!servicesEnabled) {
      return {
        areaLatE5: null as number | null,
        areaLngE5: null as number | null,
        warning: 'Location services are disabled.',
      };
    }

    let permission = await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted' && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      return {
        areaLatE5: null as number | null,
        areaLngE5: null as number | null,
        warning: 'Allow location permission to improve buddy matching by distance.',
      };
    }

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      areaLatE5: Math.round(currentPosition.coords.latitude * 100000),
      areaLngE5: Math.round(currentPosition.coords.longitude * 100000),
      warning: null as string | null,
    };
  } catch {
    return {
      areaLatE5: null as number | null,
      areaLngE5: null as number | null,
      warning: 'Could not access GPS right now.',
    };
  }
}

export function useSocialData() {
  const [profile, setProfile] = useState<SocialProfile | null>(socialCache?.profile ?? null);
  const [discoverResults, setDiscoverResults] = useState<DiscoverBuddy[]>(socialCache?.discoverResults ?? []);
  const [incomingRequests, setIncomingRequests] = useState<BuddyRequest[]>(socialCache?.incomingRequests ?? []);
  const [outgoingRequests, setOutgoingRequests] = useState<BuddyRequest[]>(socialCache?.outgoingRequests ?? []);
  const [buddies, setBuddies] = useState<BuddySummary[]>(socialCache?.buddies ?? []);
  const [meetupIncoming, setMeetupIncoming] = useState<SocialMeetupInvite[]>(socialCache?.meetupIncoming ?? []);
  const [meetupOutgoing, setMeetupOutgoing] = useState<SocialMeetupInvite[]>(socialCache?.meetupOutgoing ?? []);
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [activeBuddyUserId, setActiveBuddyUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SocialNotification[]>(socialCache?.notifications ?? []);

  const [filters, setFilters] = useState<DiscoverFilters>({
    radiusKm: 10,
    goals: [],
    experienceLevel: '',
    preferredDays: [],
    district: '',
    language: '',
  });

  const [isLoading, setIsLoading] = useState(!socialCache);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRefreshingDiscover, setIsRefreshingDiscover] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasLoadedOnceRef = useRef(Boolean(socialCache));
  const lastSyncAtRef = useRef(socialCache?.cachedAt ?? 0);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const apiCall = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!apiBaseUrl) {
        throw new Error('No API base URL available. Set EXPO_PUBLIC_API_BASE_URL for native builds.');
      }

      const shouldAddNgrokHeader = apiBaseUrl.includes('ngrok');
      const cookies = authClient.getCookie();
      const headers = new Headers(init?.headers);

      headers.set('Content-Type', 'application/json');

      if (shouldAddNgrokHeader) {
        headers.set('ngrok-skip-browser-warning', 'true');
      }

      if (cookies) {
        headers.set('Cookie', cookies);
      }

      const response = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers,
        credentials: 'omit',
      });

      const body = (await response.json().catch(() => null)) as T & { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error || `Request failed with status ${response.status}.`);
      }

      if (!body) {
        throw new Error('Unexpected empty response body.');
      }

      return body;
    },
    [apiBaseUrl]
  );

  const refreshProfile = useCallback(async () => {
    const response = await apiCall<{ profile: SocialProfile | null }>('/api/workouts/social/profile');
    setProfile(response.profile);
    lastSyncAtRef.current = updateSocialCache({ profile: response.profile });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshRequests = useCallback(async () => {
    const response = await apiCall<{ incoming: BuddyRequest[]; outgoing: BuddyRequest[] }>(
      '/api/workouts/social/requests'
    );
    setIncomingRequests(response.incoming);
    setOutgoingRequests(response.outgoing);
    lastSyncAtRef.current = updateSocialCache({
      incomingRequests: response.incoming,
      outgoingRequests: response.outgoing,
    });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshBuddies = useCallback(async () => {
    const response = await apiCall<{ buddies: BuddySummary[] }>('/api/workouts/social/buddies');
    setBuddies(response.buddies);
    lastSyncAtRef.current = updateSocialCache({ buddies: response.buddies });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshNotifications = useCallback(async () => {
    const response = await apiCall<{ notifications: SocialNotification[] }>(
      '/api/workouts/social/notifications'
    );
    setNotifications(response.notifications);
    lastSyncAtRef.current = updateSocialCache({ notifications: response.notifications });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshMeetups = useCallback(async () => {
    const response = await apiCall<{ incoming: SocialMeetupInvite[]; outgoing: SocialMeetupInvite[] }>(
      '/api/workouts/social/meetups'
    );
    setMeetupIncoming(response.incoming);
    setMeetupOutgoing(response.outgoing);
    lastSyncAtRef.current = updateSocialCache({
      meetupIncoming: response.incoming,
      meetupOutgoing: response.outgoing,
    });
    hasLoadedOnceRef.current = true;
  }, [apiCall]);

  const refreshDiscover = useCallback(
    async (nextFilters?: Partial<DiscoverFilters>, options: RefreshDiscoverOptions = {}) => {
      const { silent = false } = options;
      const applied: DiscoverFilters = {
        ...filters,
        ...nextFilters,
      };

      if (nextFilters) {
        setFilters(applied);
      }

      if (!silent) {
        setIsRefreshingDiscover(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('radiusKm', String(applied.radiusKm));

        if (applied.goals.length > 0) {
          params.set('goals', toCsv(applied.goals));
        }

        if (applied.experienceLevel.trim()) {
          params.set('experienceLevel', applied.experienceLevel.trim());
        }

        if (applied.preferredDays.length > 0) {
          params.set('preferredDays', toCsv(applied.preferredDays));
        }

        if (applied.district.trim()) {
          params.set('district', applied.district.trim());
        }

        if (applied.language.trim()) {
          params.set('language', applied.language.trim());
        }

        const response = await apiCall<{ buddies: DiscoverBuddy[] }>(
          `/api/workouts/social/discover?${params.toString()}`
        );

        setDiscoverResults(response.buddies);
        lastSyncAtRef.current = updateSocialCache({ discoverResults: response.buddies });
        hasLoadedOnceRef.current = true;
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not refresh discover results.'));
      } finally {
        if (!silent) {
          setIsRefreshingDiscover(false);
        }
      }
    },
    [apiCall, filters]
  );

  const loadInitialData = useCallback(async (options: LoadSocialOptions = {}) => {
    const { force = false, silent = false } = options;
    const shouldShowSpinner = !silent || !hasLoadedOnceRef.current;

    if (!force && socialLoadPromise) {
      await socialLoadPromise;
      return;
    }

    if (
      !force &&
      hasLoadedOnceRef.current &&
      Date.now() - lastSyncAtRef.current < SOCIAL_FOCUS_REFRESH_COOLDOWN_MS
    ) {
      return;
    }

    if (shouldShowSpinner) {
      setIsLoading(true);
    }

    if (!silent) {
      setFeedback(null);
    }
    setErrorMessage(null);

    const loadPromise = (async () => {
      try {
        await Promise.all([
          refreshProfile(),
          refreshRequests(),
          refreshBuddies(),
          refreshMeetups(),
          refreshNotifications(),
          refreshDiscover(undefined, { silent: true }),
        ]);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not load social data.'));
      }
    })();

    socialLoadPromise = loadPromise;

    try {
      await loadPromise;
    } finally {
      if (socialLoadPromise === loadPromise) {
        socialLoadPromise = null;
      }

      if (shouldShowSpinner) {
        setIsLoading(false);
      }
    }
  }, [refreshBuddies, refreshDiscover, refreshMeetups, refreshNotifications, refreshProfile, refreshRequests]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnceRef.current) {
        void loadInitialData({ force: true });
        return;
      }

      if (Date.now() - lastSyncAtRef.current < SOCIAL_FOCUS_REFRESH_COOLDOWN_MS) {
        return;
      }

      const interaction = InteractionManager.runAfterInteractions(() => {
        void loadInitialData({ force: true, silent: true });
      });

      return () => {
        interaction.cancel();
      };
    }, [loadInitialData])
  );

  const refreshNow = useCallback(async () => {
    await loadInitialData({ force: true });
  }, [loadInitialData]);

  const saveProfile = useCallback(
    async (input: {
      experienceLevel: string;
      trainingGoals: string[];
      preferredDays: string[];
      preferredTimeWindows: string[];
      genderPreference: string;
      gymDistrict: string;
      city: string;
      language: string;
      bio?: string | null;
      isDiscoverable: boolean;
      isPrivateProfile: boolean;
      searchRadiusKm: number;
      areaLatE5?: number | null;
      areaLngE5?: number | null;
    }) => {
      setIsSavingProfile(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        const gpsArea = await resolveCurrentAreaE5();

        const response = await apiCall<{ profile: SocialProfile | null }>('/api/workouts/social/profile', {
          method: 'PUT',
          body: JSON.stringify({
            ...input,
            areaLatE5: gpsArea.areaLatE5,
            areaLngE5: gpsArea.areaLngE5,
          }),
        });

        setProfile(response.profile);

        if (gpsArea.warning) {
          setFeedback(`Social profile saved. ${gpsArea.warning}`);
        } else {
          setFeedback('Social profile saved with your current GPS area.');
        }

        await refreshDiscover();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not save social profile.'));
      } finally {
        setIsSavingProfile(false);
      }
    },
    [apiCall, refreshDiscover]
  );

  const sendRequest = useCallback(
    async (toUserId: string, message?: string) => {
      setIsSendingRequest(true);
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/requests', {
          method: 'POST',
          body: JSON.stringify({ toUserId, message: message?.trim() || null }),
        });

        setFeedback('Buddy request sent.');
        await Promise.all([refreshRequests(), refreshBuddies(), refreshDiscover()]);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not send buddy request.'));
      } finally {
        setIsSendingRequest(false);
      }
    },
    [apiCall, refreshBuddies, refreshDiscover, refreshRequests]
  );

  const respondRequest = useCallback(
    async (requestId: string, action: 'accept' | 'decline') => {
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/requests', {
          method: 'PATCH',
          body: JSON.stringify({ requestId, action }),
        });

        setFeedback(action === 'accept' ? 'Buddy request accepted.' : 'Buddy request declined.');
        await Promise.all([refreshRequests(), refreshBuddies(), refreshDiscover()]);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not update buddy request.'));
      }
    },
    [apiCall, refreshBuddies, refreshDiscover, refreshRequests]
  );

  const openChat = useCallback(
    async (buddyUserId: string) => {
      setActiveBuddyUserId(buddyUserId);
      setErrorMessage(null);

      try {
        const response = await apiCall<{ messages: SocialMessage[] }>(
          `/api/workouts/social/messages/${encodeURIComponent(buddyUserId)}`
        );
        setMessages(response.messages);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not load messages.'));
      }
    },
    [apiCall]
  );

  const refreshActiveChat = useCallback(async () => {
    if (!activeBuddyUserId) {
      return;
    }

    try {
      const response = await apiCall<{ messages: SocialMessage[] }>(
        `/api/workouts/social/messages/${encodeURIComponent(activeBuddyUserId)}`
      );
      setMessages(response.messages);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not refresh messages.'));
    }
  }, [activeBuddyUserId, apiCall]);

  const sendChatMessage = useCallback(
    async (messageBody: string) => {
      if (!activeBuddyUserId) {
        return;
      }

      setIsSendingMessage(true);
      setErrorMessage(null);

      try {
        await apiCall(`/api/workouts/social/messages/${encodeURIComponent(activeBuddyUserId)}`, {
          method: 'POST',
          body: JSON.stringify({ body: messageBody }),
        });
        await refreshActiveChat();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not send message.'));
      } finally {
        setIsSendingMessage(false);
      }
    },
    [activeBuddyUserId, apiCall, refreshActiveChat]
  );

  const saveAvailability = useCallback(
    async (payload: {
      recurringSlots: Array<{ dayOfWeek: number; startMinute: number; endMinute: number; isActive?: boolean }>;
      oneOffSlots: Array<{ startsAt: string; endsAt: string; status?: 'available' | 'busy' }>;
    }) => {
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/availability', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setFeedback('Availability saved.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not save availability.'));
      }
    },
    [apiCall]
  );

  const createMeetup = useCallback(
    async (payload: {
      receiverUserId: string;
      startsAt: string;
      endsAt: string;
      gymArea: string;
      note?: string | null;
    }) => {
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/meetups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setFeedback('Meetup invite sent.');
        await Promise.all([refreshMeetups(), refreshNotifications()]);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not create meetup invite.'));
      }
    },
    [apiCall, refreshMeetups, refreshNotifications]
  );

  const respondMeetup = useCallback(
    async (inviteId: string, action: 'accept' | 'decline') => {
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/meetups', {
          method: 'PATCH',
          body: JSON.stringify({ inviteId, action }),
        });

        setFeedback(action === 'accept' ? 'Meetup accepted.' : 'Meetup declined.');
        await Promise.all([refreshMeetups(), refreshNotifications()]);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not update meetup invite.'));
      }
    },
    [apiCall, refreshMeetups, refreshNotifications]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((entry) => entry.status === 'unread').map((entry) => entry.id);

    if (unread.length === 0) {
      return;
    }

    setErrorMessage(null);

    try {
      const response = await apiCall<{ notifications: SocialNotification[] }>('/api/workouts/social/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationIds: unread }),
      });

      setNotifications(response.notifications);
      setFeedback('Notifications marked as read.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not update notifications.'));
    }
  }, [apiCall, notifications]);

  const blockBuddyUser = useCallback(
    async (blockedUserId: string, reason?: string) => {
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/moderation/block', {
          method: 'POST',
          body: JSON.stringify({ blockedUserId, reason: reason?.trim() || null }),
        });

        setFeedback('User blocked.');
        setActiveBuddyUserId(null);
        setMessages([]);
        await Promise.all([refreshBuddies(), refreshRequests(), refreshDiscover()]);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not block user.'));
      }
    },
    [apiCall, refreshBuddies, refreshDiscover, refreshRequests]
  );

  const reportBuddyUser = useCallback(
    async (reportedUserId: string, category: string, details?: string) => {
      setErrorMessage(null);
      setFeedback(null);

      try {
        await apiCall('/api/workouts/social/moderation/report', {
          method: 'POST',
          body: JSON.stringify({ reportedUserId, category, details: details?.trim() || null }),
        });

        setFeedback('Report submitted.');
      } catch (error) {
        setErrorMessage(getErrorMessage(error, 'Could not submit report.'));
      }
    },
    [apiCall]
  );

  return {
    profile,
    discoverResults,
    incomingRequests,
    outgoingRequests,
    buddies,
    meetupIncoming,
    meetupOutgoing,
    messages,
    activeBuddyUserId,
    notifications,
    filters,
    isLoading,
    isSavingProfile,
    isRefreshingDiscover,
    isSendingRequest,
    isSendingMessage,
    feedback,
    errorMessage,
    loadInitialData,
    refreshNow,
    saveProfile,
    refreshDiscover,
    sendRequest,
    respondRequest,
    openChat,
    refreshActiveChat,
    sendChatMessage,
    saveAvailability,
    createMeetup,
    respondMeetup,
    markAllNotificationsRead,
    blockBuddyUser,
    reportBuddyUser,
    setFilters,
    setActiveBuddyUserId,
  };
}
