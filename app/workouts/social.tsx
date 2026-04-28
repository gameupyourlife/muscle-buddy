import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionChips } from '@/components/ui/option-chips';
import { Text } from '@/components/ui/text';
import {
    SOCIAL_DAY_OPTIONS,
    SOCIAL_EXPERIENCE_OPTIONS,
    SOCIAL_GOAL_OPTIONS,
    useSocialData,
} from '@/lib/workouts/use-social';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function firstCsvValue(value: string) {
  const parts = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return parts[0] ?? '';
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roundToQuarterHour(value: Date) {
  const rounded = new Date(value);
  const minutes = rounded.getMinutes();
  const nextQuarter = Math.ceil(minutes / 15) * 15;

  rounded.setMinutes(nextQuarter, 0, 0);
  return rounded;
}

function tomorrowAt(hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function nextWeekdayAt(weekday: number, hour: number, minute: number) {
  const date = new Date();
  const dayDiff = (weekday - date.getDay() + 7) % 7;
  const addDays = dayDiff === 0 ? 7 : dayDiff;

  date.setDate(date.getDate() + addDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function startFromPreset(value: string) {
  if (value === 'in-2h') {
    return roundToQuarterHour(new Date(Date.now() + 2 * 60 * 60 * 1000));
  }

  if (value === 'tomorrow-am') {
    return tomorrowAt(7, 0);
  }

  if (value === 'weekend') {
    return nextWeekdayAt(6, 10, 0);
  }

  return tomorrowAt(18, 0);
}

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const {
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
    isLoading,
    isSavingProfile,
    isRefreshingDiscover,
    isSendingRequest,
    isSendingMessage,
    feedback,
    errorMessage,
    saveProfile,
    refreshDiscover,
    sendRequest,
    respondRequest,
    openChat,
    refreshActiveChat,
    sendChatMessage,
    createMeetup,
    respondMeetup,
    markAllNotificationsRead,
    blockBuddyUser,
    reportBuddyUser,
    setActiveBuddyUserId,
  } = useSocialData();

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [gymDistrict, setGymDistrict] = useState('');
  const [language, setLanguage] = useState('en');
  const [bio, setBio] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [trainingGoal, setTrainingGoal] = useState('strength');
  const [preferredDay, setPreferredDay] = useState('mon');
  const [searchRadiusKm, setSearchRadiusKm] = useState('10');
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);

  const [discoverGoal, setDiscoverGoal] = useState('');
  const [discoverLevel, setDiscoverLevel] = useState('');
  const [discoverDay, setDiscoverDay] = useState('');

  const [requestMessage, setRequestMessage] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [meetupBuddyUserId, setMeetupBuddyUserId] = useState('');
  const [meetupPreset, setMeetupPreset] = useState('tomorrow-pm');
  const [meetupStartsAt, setMeetupStartsAt] = useState(() => startFromPreset('tomorrow-pm'));
  const [meetupDurationMinutes, setMeetupDurationMinutes] = useState('60');
  const [meetupGymArea, setMeetupGymArea] = useState('');
  const [meetupNote, setMeetupNote] = useState('');

  const contentPaddingTop = Math.max(16, insets.top + 6);
  const contentPaddingBottom = Math.max(36, insets.bottom + 24);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDisplayName(profile.displayName);
    setCity(profile.city);
    setGymDistrict(profile.gymDistrict);
    setLanguage(profile.language);
    setBio(profile.bio ?? '');
    setExperienceLevel(profile.experienceLevel || 'beginner');
    setTrainingGoal(firstCsvValue(profile.trainingGoals) || 'strength');
    setPreferredDay(firstCsvValue(profile.preferredDays) || 'mon');
    setSearchRadiusKm(String(profile.searchRadiusKm || 10));
    setIsDiscoverable(profile.isDiscoverable);
    setIsPrivateProfile(profile.isPrivateProfile);
  }, [profile]);

  const pendingOutgoingSet = useMemo(
    () =>
      new Set(
        outgoingRequests
          .filter((entry) => entry.status === 'pending')
          .map((entry) => entry.toUserId)
      ),
    [outgoingRequests]
  );

  const activeBuddy = useMemo(
    () => buddies.find((entry) => entry.buddyUserId === activeBuddyUserId) ?? null,
    [activeBuddyUserId, buddies]
  );

  const buddyOptions = useMemo(
    () =>
      buddies.map((entry) => ({
        value: entry.buddyUserId,
        label: entry.profile?.displayName || entry.buddyUserId,
      })),
    [buddies]
  );

  const meetupPresetOptions = useMemo(
    () => [
      { value: 'in-2h', label: 'In 2h' },
      { value: 'tomorrow-am', label: 'Tomorrow AM' },
      { value: 'tomorrow-pm', label: 'Tomorrow PM' },
      { value: 'weekend', label: 'Weekend' },
      { value: 'custom', label: 'Custom' },
    ],
    []
  );

  const meetupDurationOptions = useMemo(
    () => [
      { value: '45', label: '45m' },
      { value: '60', label: '60m' },
      { value: '90', label: '90m' },
      { value: '120', label: '120m' },
    ],
    []
  );

  const meetupEndsAt = useMemo(() => {
    const minutes = Number(meetupDurationMinutes);

    if (!Number.isFinite(minutes) || minutes < 15) {
      return new Date(meetupStartsAt.getTime() + 60 * 60 * 1000);
    }

    return new Date(meetupStartsAt.getTime() + minutes * 60 * 1000);
  }, [meetupDurationMinutes, meetupStartsAt]);

  const meetupTimeError = useMemo(() => {
    if (meetupStartsAt.getTime() <= Date.now() + 5 * 60 * 1000) {
      return 'Pick a start time at least 5 minutes in the future.';
    }

    if (meetupEndsAt <= meetupStartsAt) {
      return 'Duration must create an end time after the start time.';
    }

    return null;
  }, [meetupEndsAt, meetupStartsAt]);

  const canSendMeetup =
    meetupBuddyUserId.length > 0 && meetupGymArea.trim().length > 0 && meetupTimeError === null;

  useEffect(() => {
    if (buddies.length === 0) {
      setMeetupBuddyUserId('');
      return;
    }

    if (!meetupBuddyUserId || !buddies.some((entry) => entry.buddyUserId === meetupBuddyUserId)) {
      setMeetupBuddyUserId(buddies[0]?.buddyUserId ?? '');
    }
  }, [buddies, meetupBuddyUserId]);

  useEffect(() => {
    if (!activeBuddyUserId) {
      return;
    }

    const interval = setInterval(() => {
      void refreshActiveChat();
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [activeBuddyUserId, refreshActiveChat]);

  useEffect(() => {
    if (meetupPreset === 'custom') {
      return;
    }

    setMeetupStartsAt(startFromPreset(meetupPreset));
  }, [meetupPreset]);

  const saveProfilePress = async () => {
    await saveProfile({
      displayName,
      experienceLevel,
      trainingGoals: [trainingGoal],
      preferredDays: [preferredDay],
      preferredTimeWindows: [],
      genderPreference: 'any',
      gymDistrict,
      city,
      language,
      bio: bio.trim() || null,
      isDiscoverable,
      isPrivateProfile,
      searchRadiusKm: Number(searchRadiusKm),
    });
  };

  const applyFilters = async () => {
    await refreshDiscover({
      radiusKm: Number(searchRadiusKm),
      goals: discoverGoal ? [discoverGoal] : [],
      experienceLevel: discoverLevel,
      preferredDays: discoverDay ? [discoverDay] : [],
      district: gymDistrict,
      language,
    });
  };

  const sendRequestPress = async (targetUserId: string) => {
    await sendRequest(targetUserId, requestMessage.trim() || undefined);
    setRequestMessage('');
  };

  const sendMessagePress = async () => {
    if (!chatMessage.trim()) {
      return;
    }

    await sendChatMessage(chatMessage);
    setChatMessage('');
  };

  const sendMeetupPress = async () => {
    if (!canSendMeetup) {
      return;
    }

    await createMeetup({
      receiverUserId: meetupBuddyUserId,
      startsAt: meetupStartsAt.toISOString(),
      endsAt: meetupEndsAt.toISOString(),
      gymArea: meetupGymArea.trim(),
      note: meetupNote.trim() || null,
    });

    setMeetupNote('');
  };

  const updateMeetupStartDate = (nextDate: Date | undefined) => {
    if (!nextDate) {
      return;
    }

    setMeetupPreset('custom');
    setMeetupStartsAt((current) => {
      const next = new Date(current);
      next.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      return next;
    });
  };

  const updateMeetupStartTime = (nextDate: Date | undefined) => {
    if (!nextDate) {
      return;
    }

    setMeetupPreset('custom');
    setMeetupStartsAt((current) => {
      const next = new Date(current);
      next.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
      return next;
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Social' }} />
      <ScrollView
        className="flex-1 bg-black"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
          gap: 16,
        }}
      >
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-[13px] font-semibold uppercase text-[#8e8e93]">Find Your Real Muscle Buddy</Text>
          {isLoading ? <ActivityIndicator size="small" color="white" /> : null}
        </View>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <Text className="text-white text-base font-semibold" selectable>
            Your social profile
          </Text>

          <View className="gap-2">
            <Label nativeID="display-name" className="text-white">Display name</Label>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              className="bg-black/30 border-white/10"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="city" className="text-white">City</Label>
            <Input
              value={city}
              onChangeText={setCity}
              placeholder="City"
              className="bg-black/30 border-white/10"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="district" className="text-white">Gym district</Label>
            <Input
              value={gymDistrict}
              onChangeText={setGymDistrict}
              placeholder="District"
              className="bg-black/30 border-white/10"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="language" className="text-white">Language</Label>
            <Input
              value={language}
              onChangeText={setLanguage}
              placeholder="Language"
              className="bg-black/30 border-white/10"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="bio" className="text-white">Bio</Label>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="What do you like to train?"
              className="bg-black/30 border-white/10"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="experience" className="text-white">Experience level</Label>
            <OptionChips
              items={SOCIAL_EXPERIENCE_OPTIONS}
              value={experienceLevel}
              onValueChange={setExperienceLevel}
              size="sm"
              layout="wrap"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="goal" className="text-white">Main goal</Label>
            <OptionChips
              items={SOCIAL_GOAL_OPTIONS}
              value={trainingGoal}
              onValueChange={setTrainingGoal}
              size="sm"
              layout="wrap"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="preferred-day" className="text-white">Preferred day</Label>
            <OptionChips
              items={SOCIAL_DAY_OPTIONS}
              value={preferredDay}
              onValueChange={setPreferredDay}
              size="sm"
              layout="wrap"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="radius" className="text-white">Search radius (km)</Label>
            <Input
              value={searchRadiusKm}
              onChangeText={setSearchRadiusKm}
              keyboardType="number-pad"
              placeholder="10"
              className="bg-black/30 border-white/10"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-white text-sm" selectable>Discoverable profile</Text>
            <Switch value={isDiscoverable} onValueChange={setIsDiscoverable} />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-white text-sm" selectable>Private profile</Text>
            <Switch value={isPrivateProfile} onValueChange={setIsPrivateProfile} />
          </View>

          <Button onPress={saveProfilePress} disabled={isSavingProfile}>
            <Text>{isSavingProfile ? 'Saving...' : 'Save profile'}</Text>
          </Button>
        </Card>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-base font-semibold" selectable>
              Discover gym buddies
            </Text>
            {isRefreshingDiscover ? <ActivityIndicator size="small" color="white" /> : null}
          </View>

          <View className="gap-2">
            <Label nativeID="discover-goal" className="text-white">Goal filter</Label>
            <OptionChips
              items={[{ value: '', label: 'Any' }, ...SOCIAL_GOAL_OPTIONS]}
              value={discoverGoal}
              onValueChange={setDiscoverGoal}
              size="sm"
              layout="wrap"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="discover-level" className="text-white">Experience filter</Label>
            <OptionChips
              items={[{ value: '', label: 'Any' }, ...SOCIAL_EXPERIENCE_OPTIONS]}
              value={discoverLevel}
              onValueChange={setDiscoverLevel}
              size="sm"
              layout="wrap"
            />
          </View>

          <View className="gap-2">
            <Label nativeID="discover-day" className="text-white">Day filter</Label>
            <OptionChips
              items={[{ value: '', label: 'Any' }, ...SOCIAL_DAY_OPTIONS]}
              value={discoverDay}
              onValueChange={setDiscoverDay}
              size="sm"
              layout="wrap"
            />
          </View>

          <Button variant="secondary" onPress={applyFilters}>
            <Text>Apply filters</Text>
          </Button>

          <View className="gap-2">
            <Input
              value={requestMessage}
              onChangeText={setRequestMessage}
              placeholder="Optional request message"
              className="bg-black/30 border-white/10"
            />
            {discoverResults.length === 0 ? (
              <Text className="text-sm text-[#8e8e93]" selectable>No buddy candidates with current filters.</Text>
            ) : null}

            {discoverResults.map((candidate) => {
              const alreadyPending = pendingOutgoingSet.has(candidate.userId);

              return (
                <View key={candidate.userId} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-semibold" selectable>{candidate.displayName}</Text>
                    <Badge variant="outline">
                      <Text>{candidate.experienceLevel}</Text>
                    </Badge>
                  </View>
                  <Text className="text-[#c7c7cc] text-xs" selectable>
                    {candidate.city} · {candidate.gymDistrict} · {candidate.language}
                  </Text>
                  <Text className="text-[#8e8e93] text-xs" selectable>
                    Goals: {candidate.trainingGoals || 'n/a'}
                  </Text>
                  <Button
                    onPress={() => sendRequestPress(candidate.userId)}
                    disabled={isSendingRequest || alreadyPending}
                  >
                    <Text>{alreadyPending ? 'Request pending' : 'Send request'}</Text>
                  </Button>
                </View>
              );
            })}
          </View>
        </Card>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <Text className="text-white text-base font-semibold" selectable>Incoming requests</Text>
          {incomingRequests.filter((entry) => entry.status === 'pending').length === 0 ? (
            <Text className="text-sm text-[#8e8e93]" selectable>No pending requests.</Text>
          ) : null}
          {incomingRequests
            .filter((entry) => entry.status === 'pending')
            .map((entry) => (
              <View key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-2">
                <Text className="text-white" selectable>{entry.fromProfile?.displayName || entry.fromUserId}</Text>
                <Text className="text-[#8e8e93] text-xs" selectable>{entry.message || 'No message provided.'}</Text>
                <View className="flex-row gap-2">
                  <Button className="flex-1" onPress={() => respondRequest(entry.id, 'accept')}>
                    <Text>Accept</Text>
                  </Button>
                  <Button className="flex-1" variant="outline" onPress={() => respondRequest(entry.id, 'decline')}>
                    <Text>Decline</Text>
                  </Button>
                </View>
              </View>
            ))}
        </Card>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <Text className="text-white text-base font-semibold" selectable>Outgoing requests</Text>
          {outgoingRequests.filter((entry) => entry.status === 'pending').length === 0 ? (
            <Text className="text-sm text-[#8e8e93]" selectable>No outgoing pending requests.</Text>
          ) : null}
          {outgoingRequests
            .filter((entry) => entry.status === 'pending')
            .map((entry) => (
              <View key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-2">
                <Text className="text-white" selectable>{entry.toProfile?.displayName || entry.toUserId}</Text>
                <Text className="text-[#8e8e93] text-xs" selectable>{entry.message || 'No message provided.'}</Text>
                <Badge variant="outline">
                  <Text>Pending</Text>
                </Badge>
              </View>
            ))}
        </Card>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <Text className="text-white text-base font-semibold" selectable>Buddies</Text>
          {buddies.length === 0 ? (
            <Text className="text-sm text-[#8e8e93]" selectable>No buddies yet.</Text>
          ) : null}
          {buddies.map((entry) => (
            <View key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-2">
              <Text className="text-white font-semibold" selectable>
                {entry.profile?.displayName || entry.buddyUserId}
              </Text>
              <Text className="text-[#8e8e93] text-xs" selectable>
                {entry.profile?.city || 'Unknown city'} · {entry.profile?.gymDistrict || 'Unknown district'}
              </Text>
              <View className="flex-row gap-2">
                <Button className="flex-1" onPress={() => openChat(entry.buddyUserId)}>
                  <Text>Open chat</Text>
                </Button>
                <Button className="flex-1" variant="outline" onPress={() => blockBuddyUser(entry.buddyUserId)}>
                  <Text>Block</Text>
                </Button>
                <Button className="flex-1" variant="outline" onPress={() => reportBuddyUser(entry.buddyUserId, 'abuse')}>
                  <Text>Report</Text>
                </Button>
              </View>
            </View>
          ))}
        </Card>

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <Text className="text-white text-base font-semibold" selectable>Meetup planner</Text>
          {buddyOptions.length === 0 ? (
            <Text className="text-sm text-[#8e8e93]" selectable>Accept a buddy request first to plan a meetup.</Text>
          ) : (
            <>
              <View className="gap-2">
                <Label nativeID="meetup-buddy" className="text-white">Buddy</Label>
                <OptionChips
                  items={buddyOptions}
                  value={meetupBuddyUserId}
                  onValueChange={setMeetupBuddyUserId}
                  size="sm"
                  layout="wrap"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="meetup-presets" className="text-white">Quick schedule</Label>
                <OptionChips
                  items={meetupPresetOptions}
                  value={meetupPreset}
                  onValueChange={setMeetupPreset}
                  size="sm"
                  layout="wrap"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="meetup-start-date" className="text-white">Start date</Label>
                <DateTimePicker
                  value={meetupStartsAt}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_event, selectedDate) => updateMeetupStartDate(selectedDate)}
                />
              </View>
              <View className="gap-2">
                <Label nativeID="meetup-start-time" className="text-white">Start time</Label>
                <DateTimePicker
                  value={meetupStartsAt}
                  mode="time"
                  minuteInterval={15}
                  onChange={(_event, selectedDate) => updateMeetupStartTime(selectedDate)}
                />
              </View>
              <View className="gap-2">
                <Label nativeID="meetup-duration" className="text-white">Duration</Label>
                <OptionChips
                  items={meetupDurationOptions}
                  value={meetupDurationMinutes}
                  onValueChange={setMeetupDurationMinutes}
                  size="sm"
                  layout="wrap"
                />
                <Text className="text-xs text-[#8e8e93]" selectable>
                  {formatDateTime(meetupStartsAt.toISOString())} - {formatDateTime(meetupEndsAt.toISOString())}
                </Text>
                {meetupTimeError ? (
                  <Text className="text-xs text-destructive" selectable>{meetupTimeError}</Text>
                ) : null}
              </View>
              <View className="gap-2">
                <Label nativeID="meetup-gym-area" className="text-white">Gym area</Label>
                <Input
                  value={meetupGymArea}
                  onChangeText={setMeetupGymArea}
                  placeholder="Downtown / district"
                  className="bg-black/30 border-white/10"
                />
              </View>
              <View className="gap-2">
                <Label nativeID="meetup-note" className="text-white">Note</Label>
                <Input
                  value={meetupNote}
                  onChangeText={setMeetupNote}
                  placeholder="Optional meetup note"
                  className="bg-black/30 border-white/10"
                />
              </View>
              <Button onPress={sendMeetupPress} disabled={!canSendMeetup}>
                <Text>Send meetup invite</Text>
              </Button>
            </>
          )}

          <View className="mt-2 gap-2">
            <Text className="text-white text-sm font-semibold" selectable>Incoming invites</Text>
            {meetupIncoming.filter((entry) => entry.status === 'pending').length === 0 ? (
              <Text className="text-sm text-[#8e8e93]" selectable>No pending meetup invites.</Text>
            ) : null}
            {meetupIncoming
              .filter((entry) => entry.status === 'pending')
              .map((entry) => (
                <View key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-2">
                  <Text className="text-white" selectable>
                    {entry.senderProfile?.displayName || entry.senderUserId} · {entry.gymArea}
                  </Text>
                  <Text className="text-[#8e8e93] text-xs" selectable>
                    {formatDateTime(entry.startsAt)} - {formatDateTime(entry.endsAt)}
                  </Text>
                  <Text className="text-[#8e8e93] text-xs" selectable>{entry.note || 'No note provided.'}</Text>
                  <View className="flex-row gap-2">
                    <Button className="flex-1" onPress={() => respondMeetup(entry.id, 'accept')}>
                      <Text>Accept</Text>
                    </Button>
                    <Button className="flex-1" variant="outline" onPress={() => respondMeetup(entry.id, 'decline')}>
                      <Text>Decline</Text>
                    </Button>
                  </View>
                </View>
              ))}
          </View>

          <View className="mt-2 gap-2">
            <Text className="text-white text-sm font-semibold" selectable>Outgoing invites</Text>
            {meetupOutgoing.length === 0 ? (
              <Text className="text-sm text-[#8e8e93]" selectable>No outgoing meetup invites.</Text>
            ) : null}
            {meetupOutgoing.slice(0, 5).map((entry) => (
              <View key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-1">
                <Text className="text-white" selectable>
                  To {entry.receiverProfile?.displayName || entry.receiverUserId} · {entry.gymArea}
                </Text>
                <Text className="text-[#8e8e93] text-xs" selectable>
                  {formatDateTime(entry.startsAt)} - {formatDateTime(entry.endsAt)}
                </Text>
                <Text className="text-[#8e8e93] text-xs" selectable>Status: {entry.status}</Text>
              </View>
            ))}
          </View>
        </Card>

        {activeBuddy ? (
          <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-base font-semibold" selectable>
                Chat with {activeBuddy.profile?.displayName || activeBuddy.buddyUserId}
              </Text>
              <Button variant="ghost" size="sm" onPress={() => setActiveBuddyUserId(null)}>
                <Text>Close</Text>
              </Button>
            </View>
            <View className="gap-2 max-h-[240px]">
              {messages.length === 0 ? (
                <Text className="text-sm text-[#8e8e93]" selectable>No messages yet.</Text>
              ) : null}
              {messages.map((message) => {
                const isMine = message.senderUserId === profile?.userId;

                return (
                  <View
                    key={message.id}
                    style={{
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                    }}
                    className={`rounded-2xl px-3 py-2 border ${isMine ? 'bg-primary/15 border-primary/30' : 'bg-black/30 border-white/10'}`}
                  >
                    <Text className={`text-xs mb-1 ${isMine ? 'text-primary' : 'text-[#c7c7cc]'}`} selectable>
                      {isMine ? 'You' : activeBuddy.profile?.displayName || activeBuddy.buddyUserId}
                    </Text>
                    <Text className="text-white text-sm" selectable>{message.body}</Text>
                    <Text className="text-[#8e8e93] text-[11px] mt-1" selectable>
                      {formatDateTime(message.createdAt)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Input
              value={chatMessage}
              onChangeText={setChatMessage}
              placeholder="Write a message"
              className="bg-black/30 border-white/10"
            />
            <Button onPress={sendMessagePress} disabled={isSendingMessage}>
              <Text>{isSendingMessage ? 'Sending...' : 'Send message'}</Text>
            </Button>
          </Card>
        ) : null}

        <Card className="bg-[#1c1c1e] rounded-[24px] border-0 p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-base font-semibold" selectable>Notifications</Text>
            <Button variant="ghost" size="sm" onPress={markAllNotificationsRead}>
              <Text>Mark all read</Text>
            </Button>
          </View>
          {notifications.length === 0 ? (
            <Text className="text-sm text-[#8e8e93]" selectable>No notifications yet.</Text>
          ) : null}
          {notifications.slice(0, 8).map((entry) => (
            <View key={entry.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 gap-1">
              <Text className="text-white font-semibold" selectable>{entry.title}</Text>
              <Text className="text-[#c7c7cc] text-sm" selectable>{entry.body}</Text>
              <Text className="text-[#8e8e93] text-[11px]" selectable>
                {entry.status === 'unread' ? 'Unread' : 'Read'} · {entry.createdAt}
              </Text>
            </View>
          ))}
        </Card>

        {feedback ? (
          <View className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <Text className="text-primary font-medium" selectable>{feedback}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <Text className="text-destructive font-medium" selectable>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
