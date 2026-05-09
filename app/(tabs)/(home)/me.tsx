import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRow } from '@/components/ui/list-row';
import { OptionChips } from '@/components/ui/option-chips';
import { Progress } from '@/components/ui/progress';
import { ListGroup, Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getApiBaseUrl } from '@/lib/api/base-url';
import { authClient } from '@/lib/auth-client';
import {
    SOCIAL_DAY_OPTIONS,
    SOCIAL_EXPERIENCE_OPTIONS,
    SOCIAL_GOAL_OPTIONS,
    type SocialProfile,
} from '@/lib/workouts/use-social';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
    HammerIcon,
    LocateFixedIcon,
    LogOutIcon,
    ShieldCheckIcon,
    Trash2Icon,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SOCIAL_GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'female', label: 'Women' },
  { value: 'male', label: 'Men' },
  { value: 'nonbinary', label: 'Non-binary' },
];
const SOCIAL_TIME_WINDOW_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

type Feedback = { tone: 'success' | 'destructive'; message: string } | null;

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

function formatDate(value: unknown) {
  if (!value) return 'Unknown';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function parseCsv(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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

export default function MeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string; focusNonce?: string }>();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const screenScrollRef = useRef<ScrollView | null>(null);
  const buddyProfileSectionYRef = useRef<number | null>(null);
  const hasAppliedBuddyFocusRef = useRef(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [socialProfile, setSocialProfile] = useState<SocialProfile | null>(null);
  const [socialCity, setSocialCity] = useState('');
  const [socialDistrict, setSocialDistrict] = useState('');
  const [socialLanguage, setSocialLanguage] = useState('en');
  const [socialBio, setSocialBio] = useState('');
  const [socialExperience, setSocialExperience] = useState('beginner');
  const [socialGoal, setSocialGoal] = useState(SOCIAL_GOAL_OPTIONS[0]?.value ?? 'strength');
  const [socialDay, setSocialDay] = useState(SOCIAL_DAY_OPTIONS[0]?.value ?? 'mon');
  const [socialTimeWindow, setSocialTimeWindow] = useState('evening');
  const [socialGenderPreference, setSocialGenderPreference] = useState('any');
  const [socialDiscoverable, setSocialDiscoverable] = useState(true);
  const [socialPrivateProfile, setSocialPrivateProfile] = useState(false);
  const [socialRadiusKm, setSocialRadiusKm] = useState('10');
  const [socialAreaLatE5, setSocialAreaLatE5] = useState<number | null>(null);
  const [socialAreaLngE5, setSocialAreaLngE5] = useState<number | null>(null);

  const [profileFb, setProfileFb] = useState<Feedback>(null);
  const [emailFb, setEmailFb] = useState<Feedback>(null);
  const [passwordFb, setPasswordFb] = useState<Feedback>(null);
  const [sessionFb, setSessionFb] = useState<Feedback>(null);
  const [deleteFb, setDeleteFb] = useState<Feedback>(null);
  const [socialFb, setSocialFb] = useState<Feedback>(null);
  const [socialInfo, setSocialInfo] = useState<string | null>(null);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  const [isResolvingSocialLocation, setIsResolvingSocialLocation] = useState(false);
  const [isBuddyProfileHighlighted, setIsBuddyProfileHighlighted] = useState(false);

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

  const hydrateSocialForm = useCallback((nextProfile: SocialProfile | null) => {
    setSocialProfile(nextProfile);
    setSocialCity(nextProfile?.city ?? '');
    setSocialDistrict(nextProfile?.gymDistrict ?? '');
    setSocialLanguage(nextProfile?.language ?? 'en');
    setSocialBio(nextProfile?.bio ?? '');
    setSocialExperience(nextProfile?.experienceLevel ?? 'beginner');
    setSocialGoal(parseCsv(nextProfile?.trainingGoals)[0] || SOCIAL_GOAL_OPTIONS[0]?.value || 'strength');
    setSocialDay(parseCsv(nextProfile?.preferredDays)[0] || SOCIAL_DAY_OPTIONS[0]?.value || 'mon');
    setSocialTimeWindow(parseCsv(nextProfile?.preferredTimeWindows)[0] || 'evening');
    setSocialGenderPreference(nextProfile?.genderPreference ?? 'any');
    setSocialDiscoverable(nextProfile?.isDiscoverable ?? true);
    setSocialPrivateProfile(nextProfile?.isPrivateProfile ?? false);
    setSocialRadiusKm(String(nextProfile?.searchRadiusKm ?? 10));
    setSocialAreaLatE5(nextProfile?.areaLatE5 ?? null);
    setSocialAreaLngE5(nextProfile?.areaLngE5 ?? null);
  }, []);

  const maybeAutoFocusBuddyProfile = useCallback(() => {
    const shouldFocusBuddyProfile = params.focus === 'buddy-profile';
    if (!shouldFocusBuddyProfile || hasAppliedBuddyFocusRef.current) {
      return;
    }

    const targetY = buddyProfileSectionYRef.current;
    if (targetY == null) {
      return;
    }

    screenScrollRef.current?.scrollTo({ y: Math.max(0, targetY - 12), animated: true });
    hasAppliedBuddyFocusRef.current = true;
    setIsBuddyProfileHighlighted(true);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setIsBuddyProfileHighlighted(false);
    }, 2500);
  }, [params.focus]);

  const loadSocialProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingSocial(true);
    setSocialFb(null);
    setSocialInfo(null);

    try {
      const response = await apiCall<{ profile: SocialProfile | null }>('/api/workouts/social/profile');
      hydrateSocialForm(response.profile);
      if (!response.profile) {
        setSocialInfo('Set up your buddy profile to appear in discovery and get better matches.');
      }
    } catch (error) {
      setSocialFb({
        tone: 'destructive',
        message: getErrorMessage(error, 'Could not load buddy profile settings.'),
      });
    } finally {
      setIsLoadingSocial(false);
    }
  }, [apiCall, hydrateSocialForm, user]);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user?.name, name]);

  useEffect(() => {
    const shouldFocusBuddyProfile = params.focus === 'buddy-profile';
    if (shouldFocusBuddyProfile) {
      hasAppliedBuddyFocusRef.current = false;
      setIsBuddyProfileHighlighted(false);
    }
  }, [params.focus, params.focusNonce]);

  useEffect(() => {
    maybeAutoFocusBuddyProfile();
  }, [isLoadingSocial, maybeAutoFocusBuddyProfile]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        return;
      }

      void loadSocialProfile();
    }, [loadSocialProfile, user])
  );

  const trimmedName = name.trim();
  const trimmedEmail = newEmail.trim().toLowerCase();
  const trimmedSocialCity = socialCity.trim();
  const trimmedSocialDistrict = socialDistrict.trim();
  const trimmedSocialLanguage = socialLanguage.trim().toLowerCase();
  const trimmedSocialBio = socialBio.trim();
  const socialRadiusValue = Number.parseInt(socialRadiusKm, 10);
  const normalizedSocialRadius = Number.isFinite(socialRadiusValue)
    ? Math.min(100, Math.max(1, socialRadiusValue))
    : 10;

  const canUpdateProfile =
    !!user && trimmedName.length >= 2 && trimmedName !== (user.name || '') && !isUpdatingProfile;
  const canChangeEmail =
    !!user &&
    !!trimmedEmail &&
    EMAIL_REGEX.test(trimmedEmail) &&
    trimmedEmail !== user.email.toLowerCase() &&
    !isChangingEmail;

  const passwordError = useMemo(() => {
    if (!currentPassword && !newPassword && !confirmPassword) return '';
    if (!currentPassword || !newPassword || !confirmPassword) return 'Fill all password fields.';
    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (newPassword !== confirmPassword) return 'New password and confirmation do not match.';
    if (newPassword === currentPassword) return 'New password must be different.';
    return '';
  }, [confirmPassword, currentPassword, newPassword]);

  const canChangePassword =
    !!currentPassword && !!newPassword && !!confirmPassword && !passwordError && !isChangingPassword;

  const canDelete =
    deleteConfirmation.trim().toLowerCase() === 'delete my account' && !isDeleting;

  const socialMissingRequired = [
    trimmedSocialCity.length === 0 ? 'city' : null,
    trimmedSocialDistrict.length === 0 ? 'gym district' : null,
    trimmedSocialLanguage.length === 0 ? 'language' : null,
  ].filter((entry): entry is string => !!entry);

  const socialCompletionChecks = [
    trimmedSocialCity.length > 0,
    trimmedSocialDistrict.length > 0,
    trimmedSocialLanguage.length > 0,
    trimmedSocialBio.length >= 20,
    socialGoal.length > 0,
    socialDay.length > 0,
    socialTimeWindow.length > 0,
  ];
  const socialCompletion = Math.round(
    (socialCompletionChecks.filter(Boolean).length / socialCompletionChecks.length) * 100
  );
  const canSaveSocial = !!user && socialMissingRequired.length === 0 && !isSavingSocial;

  const handleUpdateProfile = async () => {
    if (!canUpdateProfile) return;
    setProfileFb(null);
    setIsUpdatingProfile(true);
    try {
      const { error } = await authClient.updateUser({ name: trimmedName });
      setProfileFb(
        error
          ? { tone: 'destructive', message: error.message || 'Could not update profile.' }
          : { tone: 'success', message: 'Profile updated.' }
      );
    } catch (error) {
      setProfileFb({ tone: 'destructive', message: getErrorMessage(error, 'Update failed.') });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!canChangeEmail) return;
    setEmailFb(null);
    setIsChangingEmail(true);
    try {
      const { error } = await authClient.changeEmail({
        newEmail: trimmedEmail,
        callbackURL: Linking.createURL('/(tabs)/(home)/me'),
      });
      if (error) {
        setEmailFb({ tone: 'destructive', message: error.message || 'Could not change email.' });
      } else {
        setEmailFb({
          tone: 'success',
          message: 'Check your current inbox to confirm.',
        });
        setNewEmail('');
      }
    } catch (error) {
      setEmailFb({ tone: 'destructive', message: getErrorMessage(error, 'Email change failed.') });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!canChangePassword) return;
    setPasswordFb(null);
    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        setPasswordFb({ tone: 'destructive', message: error.message || 'Could not change password.' });
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordFb({
          tone: 'success',
          message: 'Password updated. Other sessions signed out.',
        });
      }
    } catch (error) {
      setPasswordFb({ tone: 'destructive', message: getErrorMessage(error, 'Password change failed.') });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevoke = async () => {
    setSessionFb(null);
    setIsRevoking(true);
    try {
      const { error } = await authClient.revokeOtherSessions();
      setSessionFb(
        error
          ? { tone: 'destructive', message: error.message || 'Could not revoke sessions.' }
          : { tone: 'success', message: 'Other sessions revoked.' }
      );
    } catch (error) {
      setSessionFb({ tone: 'destructive', message: getErrorMessage(error, 'Revoke failed.') });
    } finally {
      setIsRevoking(false);
    }
  };

  const handleSignOut = async () => {
    setSessionFb(null);
    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setSessionFb({ tone: 'destructive', message: error.message || 'Could not sign out.' });
      } else {
        router.replace('/(auth)/sign-in');
      }
    } catch (error) {
      setSessionFb({ tone: 'destructive', message: getErrorMessage(error, 'Sign-out failed.') });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleteFb(null);
    setIsDeleting(true);
    try {
      const { error } = await authClient.deleteUser({
        callbackURL: Linking.createURL('/(auth)/sign-in'),
        password: deletePassword.trim() ? deletePassword : undefined,
      });
      if (error) {
        setDeleteFb({ tone: 'destructive', message: error.message || 'Could not delete account.' });
      } else {
        router.replace('/(auth)/sign-in');
      }
    } catch (error) {
      setDeleteFb({ tone: 'destructive', message: getErrorMessage(error, 'Delete failed.') });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!canSaveSocial) {
      return;
    }

    setIsSavingSocial(true);
    setSocialFb(null);
    setSocialInfo(null);

    try {
      const response = await apiCall<{ profile: SocialProfile | null }>('/api/workouts/social/profile', {
        method: 'PUT',
        body: JSON.stringify({
          experienceLevel: socialExperience,
          trainingGoals: [socialGoal],
          preferredDays: [socialDay],
          preferredTimeWindows: [socialTimeWindow],
          genderPreference: socialGenderPreference,
          gymDistrict: trimmedSocialDistrict,
          city: trimmedSocialCity,
          language: trimmedSocialLanguage,
          bio: trimmedSocialBio || null,
          isDiscoverable: socialDiscoverable,
          isPrivateProfile: socialPrivateProfile,
          searchRadiusKm: normalizedSocialRadius,
          areaLatE5: socialAreaLatE5,
          areaLngE5: socialAreaLngE5,
        }),
      });

      hydrateSocialForm(response.profile);
      setSocialFb({
        tone: 'success',
        message: socialDiscoverable
          ? 'Buddy profile saved. You are visible in discovery.'
          : 'Buddy profile saved. Discovery is currently turned off.',
      });
    } catch (error) {
      setSocialFb({ tone: 'destructive', message: getErrorMessage(error, 'Could not save buddy profile.') });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsResolvingSocialLocation(true);
    setSocialFb(null);

    try {
      const location = await resolveCurrentAreaE5();
      setSocialAreaLatE5(location.areaLatE5);
      setSocialAreaLngE5(location.areaLngE5);

      if (location.warning) {
        setSocialInfo(location.warning);
      } else {
        setSocialInfo('Current location captured for buddy matching.');
      }
    } finally {
      setIsResolvingSocialLocation(false);
    }
  };

  if (isPending) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="text-muted-foreground">Loading your profile…</Text>
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-muted-foreground">No active session.</Text>
          <Button onPress={() => router.replace('/(auth)/sign-in')}>
            <Text>Go to sign in</Text>
          </Button>
        </View>
      </Screen>
    );
  }

  const joinedOn = formatDate(user.createdAt);

  return (
    <Screen contentContainerStyle={{ paddingTop: 8 }} scrollRef={screenScrollRef}>
      {/* Profile header */}
      <Surface>
        <View className="flex-row items-center gap-4">
          <UserAvatar
            name={user.name}
            email={user.email}
            imageUrl={user.image ?? undefined}
            size={64}
          />
          <View className="flex-1">
            <Text className="text-[20px] font-bold text-foreground" numberOfLines={1}>
              {user.name || 'Athlete'}
            </Text>
            <Text className="text-[13px] text-muted-foreground" selectable numberOfLines={1}>
              {user.email}
            </Text>
            <Text className="text-[12px] text-muted-foreground">Member since {joinedOn}</Text>
          </View>
        </View>
      </Surface>

      {/* Display name */}
      <SectionHeader title="Account" />
      <Surface>
        <View className="gap-1.5">
          <Label>Display name</Label>
          <Input value={name} onChangeText={setName} placeholder="Your name" />
        </View>
        <Button onPress={handleUpdateProfile} disabled={!canUpdateProfile}>
          {isUpdatingProfile ? <ActivityIndicator size="small" color="white" /> : null}
          <Text>{isUpdatingProfile ? 'Saving…' : 'Save name'}</Text>
        </Button>
        {profileFb ? <Banner tone={profileFb.tone} message={profileFb.message} /> : null}
      </Surface>

      {/* Buddy profile */}
      <View
        onLayout={(event) => {
          buddyProfileSectionYRef.current = event.nativeEvent.layout.y;
          maybeAutoFocusBuddyProfile();
        }}
      >
      <SectionHeader
        title="Buddy Profile"
        description="Manage how you appear in discovery and who can find you."
      />
      <Surface className={isBuddyProfileHighlighted ? 'border-primary/50 bg-primary/5' : undefined}>
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-medium text-foreground">Profile readiness</Text>
            <Badge variant={socialCompletion >= 85 ? 'default' : 'outline'}>
              <Text>{socialCompletion}%</Text>
            </Badge>
          </View>
          <Progress value={socialCompletion} />
          <Text className="text-[12px] text-muted-foreground">
            Complete city, gym district, and language first. A detailed bio boosts match quality.
          </Text>
        </View>

        {isLoadingSocial ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <Text className="text-[13px] text-muted-foreground">Loading buddy profile…</Text>
          </View>
        ) : null}

        <View className="gap-1.5">
          <Label>Discoverability</Label>
          <View className="flex-row gap-2">
            <Button
              size="sm"
              className="flex-1"
              variant={socialDiscoverable ? 'default' : 'outline'}
              onPress={() => setSocialDiscoverable(true)}
            >
              <Text>Visible</Text>
            </Button>
            <Button
              size="sm"
              className="flex-1"
              variant={!socialDiscoverable ? 'default' : 'outline'}
              onPress={() => setSocialDiscoverable(false)}
            >
              <Text>Hidden</Text>
            </Button>
          </View>
        </View>

        <View className="gap-1.5">
          <Label>Profile privacy</Label>
          <View className="flex-row gap-2">
            <Button
              size="sm"
              className="flex-1"
              variant={!socialPrivateProfile ? 'default' : 'outline'}
              onPress={() => setSocialPrivateProfile(false)}
            >
              <Text>Public profile</Text>
            </Button>
            <Button
              size="sm"
              className="flex-1"
              variant={socialPrivateProfile ? 'default' : 'outline'}
              onPress={() => setSocialPrivateProfile(true)}
            >
              <Text>Private profile</Text>
            </Button>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label>City</Label>
            <Input value={socialCity} onChangeText={setSocialCity} placeholder="Berlin" />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>Gym district</Label>
            <Input
              value={socialDistrict}
              onChangeText={setSocialDistrict}
              placeholder="Friedrichshain"
            />
          </View>
        </View>

        <View className="gap-1.5">
          <Label>Experience</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={SOCIAL_EXPERIENCE_OPTIONS}
            value={socialExperience}
            onValueChange={setSocialExperience}
          />
        </View>

        <View className="gap-1.5">
          <Label>Primary goal</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={SOCIAL_GOAL_OPTIONS}
            value={socialGoal}
            onValueChange={setSocialGoal}
          />
        </View>

        <View className="gap-1.5">
          <Label>Preferred day</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={SOCIAL_DAY_OPTIONS}
            value={socialDay}
            onValueChange={setSocialDay}
          />
        </View>

        <View className="gap-1.5">
          <Label>Preferred time</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={SOCIAL_TIME_WINDOW_OPTIONS}
            value={socialTimeWindow}
            onValueChange={setSocialTimeWindow}
          />
        </View>

        <View className="gap-1.5">
          <Label>Partner preference</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={SOCIAL_GENDER_OPTIONS}
            value={socialGenderPreference}
            onValueChange={setSocialGenderPreference}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Label>Language</Label>
            <Input value={socialLanguage} onChangeText={setSocialLanguage} placeholder="en" />
          </View>
          <View className="flex-1 gap-1.5">
            <Label>Search radius (km)</Label>
            <Input
              value={socialRadiusKm}
              onChangeText={setSocialRadiusKm}
              keyboardType="numeric"
              placeholder="10"
            />
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              void handleUseCurrentLocation();
            }}
            disabled={isResolvingSocialLocation}
          >
            <Icon as={LocateFixedIcon} size={14} className="text-foreground" />
            <Text>{isResolvingSocialLocation ? 'Locating…' : 'Use current location'}</Text>
          </Button>
          <Badge variant={socialAreaLatE5 != null && socialAreaLngE5 != null ? 'default' : 'outline'}>
            <Text>{socialAreaLatE5 != null && socialAreaLngE5 != null ? 'Location ready' : 'No location'}</Text>
          </Badge>
        </View>

        <View className="gap-1.5">
          <Label>Bio</Label>
          <Textarea
            value={socialBio}
            onChangeText={setSocialBio}
            placeholder="Tell potential buddies about your training style, schedule, and vibe."
            numberOfLines={3}
          />
          <Text className="text-[12px] text-muted-foreground">
            {trimmedSocialBio.length} characters
          </Text>
        </View>

        <Button onPress={handleSaveSocial} disabled={!canSaveSocial}>
          {isSavingSocial ? <ActivityIndicator size="small" color="white" /> : null}
          <Text>{isSavingSocial ? 'Saving…' : 'Save buddy profile'}</Text>
        </Button>

        {socialMissingRequired.length > 0 ? (
          <Banner
            tone="info"
            message={`Required fields missing: ${socialMissingRequired.join(', ')}.`}
          />
        ) : null}
        {socialInfo ? <Banner tone="info" message={socialInfo} /> : null}
        {socialFb ? <Banner tone={socialFb.tone} message={socialFb.message} /> : null}
      </Surface>
      </View>

      {/* Change email */}
      <SectionHeader title="Email" />
      <Surface>
        <View className="gap-1.5">
          <Label>New email address</Label>
          <Input
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="new@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>
        <Button variant="outline" onPress={handleChangeEmail} disabled={!canChangeEmail}>
          {isChangingEmail ? <ActivityIndicator size="small" /> : null}
          <Text>{isChangingEmail ? 'Sending…' : 'Send change email'}</Text>
        </Button>
        {emailFb ? <Banner tone={emailFb.tone} message={emailFb.message} /> : null}
      </Surface>

      {/* Change password */}
      <SectionHeader title="Password" />
      <Surface>
        <View className="gap-1.5">
          <Label>Current password</Label>
          <Input
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />
        </View>
        <View className="gap-1.5">
          <Label>New password</Label>
          <Input
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
        </View>
        <View className="gap-1.5">
          <Label>Confirm new password</Label>
          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
          />
        </View>
        {passwordError ? (
          <Text className="text-[13px] text-destructive">{passwordError}</Text>
        ) : null}
        <Button variant="outline" onPress={handleChangePassword} disabled={!canChangePassword}>
          {isChangingPassword ? <ActivityIndicator size="small" /> : null}
          <Text>{isChangingPassword ? 'Updating…' : 'Update password'}</Text>
        </Button>
        {passwordFb ? <Banner tone={passwordFb.tone} message={passwordFb.message} /> : null}
      </Surface>

      {/* Sessions */}
      <SectionHeader title="Sessions & Security" />
      <ListGroup>
        <ListRow
          icon={ShieldCheckIcon}
          title="Revoke other sessions"
          subtitle="Sign out everywhere else"
          loading={isRevoking}
          onPress={handleRevoke}
        />
        <ListRow
          icon={LogOutIcon}
          title="Sign out"
          loading={isSigningOut}
          destructive
          onPress={handleSignOut}
        />
      </ListGroup>
      {sessionFb ? <Banner tone={sessionFb.tone} message={sessionFb.message} /> : null}

      {/* Developer */}
      <SectionHeader title="Developer" />
      <ListGroup>
        <ListRow
          icon={HammerIcon}
          title="Developer options"
          subtitle="Test email & API tools"
          onPress={() => router.push('/(tabs)/(home)/dev-options')}
        />
      </ListGroup>

      {/* Danger zone */}
      <SectionHeader title="Danger Zone" />
      <Surface className="border-destructive/40">
        <Text className="text-[13px] text-muted-foreground">
          Type <Text className="font-semibold text-foreground">DELETE MY ACCOUNT</Text> below to
          permanently delete your account and all data. This cannot be undone.
        </Text>
        <View className="gap-1.5">
          <Label>Confirm deletion</Label>
          <Input
            value={deleteConfirmation}
            onChangeText={setDeleteConfirmation}
            placeholder="DELETE MY ACCOUNT"
            autoCapitalize="characters"
          />
        </View>
        <View className="gap-1.5">
          <Label>Password (if required)</Label>
          <Input
            value={deletePassword}
            onChangeText={setDeletePassword}
            secureTextEntry
          />
        </View>
        <Button variant="destructive" onPress={handleDelete} disabled={!canDelete}>
          {isDeleting ? <ActivityIndicator size="small" color="white" /> : null}
          <Icon as={Trash2Icon} size={16} className="text-destructive-foreground" />
          <Text>{isDeleting ? 'Deleting…' : 'Delete account'}</Text>
        </Button>
        {deleteFb ? <Banner tone={deleteFb.tone} message={deleteFb.message} /> : null}
      </Surface>
    </Screen>
  );
}
