import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRow } from '@/components/ui/list-row';
import { OptionChips } from '@/components/ui/option-chips';
import { ListGroup, Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
    SOCIAL_DAY_OPTIONS,
    SOCIAL_EXPERIENCE_OPTIONS,
    SOCIAL_GOAL_OPTIONS,
    useSocialData,
} from '@/lib/workouts/use-social';
import {
    CalendarPlusIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MessageCircleIcon,
    SearchIcon,
    ShieldAlertIcon,
    UserPlusIcon,
    UserXIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function BuddiesScreen() {
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
    filters,
    isLoading,
    isSavingProfile,
    isRefreshingDiscover,
    isSendingRequest,
    isSendingMessage,
    feedback,
    errorMessage,
    loadInitialData,
    saveProfile,
    refreshDiscover,
    sendRequest,
    respondRequest,
    openChat,
    sendChatMessage,
    createMeetup,
    respondMeetup,
    blockBuddyUser,
    reportBuddyUser,
    setFilters,
    setActiveBuddyUserId,
  } = useSocialData();

  // Profile editor local state
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [district, setDistrict] = useState(profile?.gymDistrict ?? '');
  const [language, setLanguage] = useState(profile?.language ?? 'en');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [experience, setExperience] = useState(profile?.experienceLevel ?? 'beginner');
  const [goal, setGoal] = useState(
    (profile?.trainingGoals?.split(',')[0] || 'general_fitness').trim()
  );
  const [day, setDay] = useState((profile?.preferredDays?.split(',')[0] || '1').trim());
  const [radius, setRadius] = useState(String(profile?.searchRadiusKm ?? 5));

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setCity(profile.city);
    setDistrict(profile.gymDistrict);
    setLanguage(profile.language);
    setBio(profile.bio ?? '');
    setExperience(profile.experienceLevel);
    setGoal((profile.trainingGoals.split(',')[0] || 'general_fitness').trim());
    setDay((profile.preferredDays.split(',')[0] || '1').trim());
    setRadius(String(profile.searchRadiusKm));
  }, [profile?.userId]);

  const [chatDraft, setChatDraft] = useState('');
  const [meetupBuddyId, setMeetupBuddyId] = useState<string | null>(null);
  const [meetupNote, setMeetupNote] = useState('');
  const [meetupGym, setMeetupGym] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === 'unread').length,
    [notifications]
  );

  const activeBuddy = buddies.find((b) => b.buddyUserId === activeBuddyUserId);

  const handleSaveProfile = () =>
    saveProfile({
      displayName: displayName.trim() || 'Athlete',
      experienceLevel: experience,
      trainingGoals: [goal],
      preferredDays: [day],
      preferredTimeWindows: ['evening'],
      genderPreference: 'any',
      gymDistrict: district,
      city,
      language,
      bio: bio.trim() || null,
      isDiscoverable: profile?.isDiscoverable ?? true,
      isPrivateProfile: profile?.isPrivateProfile ?? false,
      searchRadiusKm: Number(radius) || 5,
    });

  const submitMeetup = async (buddyUserId: string) => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    await createMeetup({
      receiverUserId: buddyUserId,
      startsAt,
      endsAt,
      gymArea: meetupGym.trim() || district || 'Main gym',
      note: meetupNote.trim() || null,
    });
    setMeetupBuddyId(null);
    setMeetupNote('');
    setMeetupGym('');
  };

  return (
    <Screen
      refreshing={isLoading}
      onRefresh={loadInitialData}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      {/* Profile editor (collapsible) */}
      <Surface>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3 flex-1">
            <UserAvatar name={displayName || profile?.displayName} size={44} />
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-foreground" numberOfLines={1}>
                {profile?.displayName || 'Set up your profile'}
              </Text>
              <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                {profile
                  ? `${experience} · ${city || 'no city'}${
                      profile.isDiscoverable ? '' : ' · hidden'
                    }`
                  : 'Required to discover buddies'}
              </Text>
            </View>
          </View>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setProfileOpen((v) => !v)}
          >
            <Icon
              as={profileOpen ? ChevronUpIcon : ChevronDownIcon}
              size={18}
              className="text-foreground"
            />
            <Text>{profileOpen ? 'Hide' : 'Edit'}</Text>
          </Button>
        </View>

        {profileOpen ? (
          <View className="gap-3 pt-2 border-t-hairline border-separator">
            <View className="gap-1.5">
              <Label>Display name</Label>
              <Input value={displayName} onChangeText={setDisplayName} placeholder="Alex" />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label>City</Label>
                <Input value={city} onChangeText={setCity} placeholder="Berlin" />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>Gym district</Label>
                <Input
                  value={district}
                  onChangeText={setDistrict}
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
                value={experience}
                onValueChange={setExperience}
              />
            </View>
            <View className="gap-1.5">
              <Label>Primary goal</Label>
              <OptionChips
                layout="scroll"
                size="sm"
                items={SOCIAL_GOAL_OPTIONS}
                value={goal}
                onValueChange={setGoal}
              />
            </View>
            <View className="gap-1.5">
              <Label>Preferred day</Label>
              <OptionChips
                layout="scroll"
                size="sm"
                items={SOCIAL_DAY_OPTIONS}
                value={day}
                onValueChange={setDay}
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label>Language</Label>
                <Input value={language} onChangeText={setLanguage} placeholder="en" />
              </View>
              <View className="flex-1 gap-1.5">
                <Label>Search radius (km)</Label>
                <Input value={radius} onChangeText={setRadius} keyboardType="numeric" />
              </View>
            </View>
            <View className="gap-1.5">
              <Label>Bio</Label>
              <Textarea
                value={bio}
                onChangeText={setBio}
                placeholder="Tell potential buddies about your training style…"
                numberOfLines={3}
              />
            </View>
            <Button onPress={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? <ActivityIndicator size="small" color="white" /> : null}
              <Text>{isSavingProfile ? 'Saving…' : 'Save profile'}</Text>
            </Button>
          </View>
        ) : null}
      </Surface>

      {unreadCount > 0 ? (
        <Banner
          tone="info"
          title={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
          message="Check your requests and meetup invites below."
        />
      ) : null}

      {/* Buddies */}
      <SectionHeader
        title="Your Buddies"
        description={buddies.length === 0 ? 'No buddies yet.' : `${buddies.length} connected`}
      />
      {buddies.length > 0 ? (
        <ListGroup>
          {buddies.map((buddy) => (
            <ListRow
              key={buddy.id}
              icon={MessageCircleIcon}
              title={buddy.profile?.displayName || 'Buddy'}
              subtitle={
                buddy.profile
                  ? `${buddy.profile.experienceLevel} · ${buddy.profile.city || '—'}`
                  : 'Connected'
              }
              onPress={() => openChat(buddy.buddyUserId)}
              selected={buddy.buddyUserId === activeBuddyUserId}
            />
          ))}
        </ListGroup>
      ) : (
        <Surface>
          <EmptyState
            compact
            icon={UserPlusIcon}
            title="No buddies yet"
            description="Discover athletes near you and send a buddy request."
          />
        </Surface>
      )}

      {/* Active chat */}
      {activeBuddy ? (
        <>
          <SectionHeader
            title={`Chat · ${activeBuddy.profile?.displayName || 'Buddy'}`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setActiveBuddyUserId(null)}
              >
                <Text>Close</Text>
              </Button>
            }
          />
          <Surface>
            <View className="gap-2 max-h-[280px]">
              {messages.length === 0 ? (
                <Text className="text-[13px] text-muted-foreground text-center py-4">
                  No messages yet. Say hi.
                </Text>
              ) : (
                messages.slice(-12).map((msg) => {
                  const mine = msg.senderUserId !== activeBuddy.buddyUserId;
                  return (
                    <View
                      key={msg.id}
                      className={
                        'max-w-[80%] rounded-2xl px-3 py-2 ' +
                        (mine
                          ? 'self-end bg-primary'
                          : 'self-start bg-surface-muted')
                      }
                      style={{ borderCurve: 'continuous' }}
                    >
                      <Text
                        className={mine ? 'text-primary-foreground' : 'text-foreground'}
                        selectable
                      >
                        {msg.body}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  value={chatDraft}
                  onChangeText={setChatDraft}
                  placeholder="Send a message…"
                  returnKeyType="send"
                  onSubmitEditing={async () => {
                    if (!chatDraft.trim()) return;
                    await sendChatMessage(chatDraft.trim());
                    setChatDraft('');
                  }}
                />
              </View>
              <Button
                onPress={async () => {
                  if (!chatDraft.trim()) return;
                  await sendChatMessage(chatDraft.trim());
                  setChatDraft('');
                }}
                disabled={isSendingMessage || !chatDraft.trim()}
              >
                <Text>{isSendingMessage ? '…' : 'Send'}</Text>
              </Button>
            </View>
            <View className="flex-row gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setMeetupBuddyId(activeBuddy.buddyUserId)}
              >
                <Icon as={CalendarPlusIcon} size={14} className="text-foreground" />
                <Text>Plan meetup</Text>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => blockBuddyUser(activeBuddy.buddyUserId)}
              >
                <Icon as={UserXIcon} size={14} className="text-destructive" />
                <Text className="text-destructive">Block</Text>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => reportBuddyUser(activeBuddy.buddyUserId, 'inappropriate')}
              >
                <Icon as={ShieldAlertIcon} size={14} className="text-destructive" />
                <Text className="text-destructive">Report</Text>
              </Button>
            </View>
          </Surface>
        </>
      ) : null}

      {/* Meetup composer */}
      {meetupBuddyId ? (
        <Surface>
          <Text className="text-[15px] font-semibold text-foreground">Plan meetup</Text>
          <View className="gap-1.5">
            <Label>Gym area</Label>
            <Input value={meetupGym} onChangeText={setMeetupGym} placeholder={district || 'Main gym'} />
          </View>
          <View className="gap-1.5">
            <Label>Note (optional)</Label>
            <Input value={meetupNote} onChangeText={setMeetupNote} placeholder="Leg day at 7pm?" />
          </View>
          <Text className="text-[12px] text-muted-foreground">
            Sends an invite for ~2 hours from now. You can reschedule from your messages.
          </Text>
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setMeetupBuddyId(null)}
            >
              <Text>Cancel</Text>
            </Button>
            <Button className="flex-1" onPress={() => submitMeetup(meetupBuddyId)}>
              <Text>Send invite</Text>
            </Button>
          </View>
        </Surface>
      ) : null}

      {/* Meetup invites */}
      {meetupIncoming.length > 0 ? (
        <>
          <SectionHeader title="Meetup Invites" />
          <ListGroup>
            {meetupIncoming.map((invite) => (
              <ListRow
                key={invite.id}
                icon={CalendarPlusIcon}
                title={invite.senderProfile?.displayName || 'Buddy'}
                subtitle={`${new Date(invite.startsAt).toLocaleString()} · ${invite.gymArea}`}
                trailing={
                  <View className="flex-row gap-1">
                    <Button
                      size="sm"
                      onPress={() => respondMeetup(invite.id, 'accept')}
                    >
                      <Text>Accept</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => respondMeetup(invite.id, 'decline')}
                    >
                      <Text>Decline</Text>
                    </Button>
                  </View>
                }
                showChevron={false}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {meetupOutgoing.length > 0 ? (
        <>
          <SectionHeader title="Sent Invites" />
          <ListGroup>
            {meetupOutgoing.slice(0, 5).map((invite) => (
              <ListRow
                key={invite.id}
                title={invite.receiverProfile?.displayName || 'Buddy'}
                subtitle={`${new Date(invite.startsAt).toLocaleString()} · ${invite.status}`}
                showChevron={false}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {/* Requests */}
      {incomingRequests.length > 0 ? (
        <>
          <SectionHeader title="Buddy Requests" />
          <ListGroup>
            {incomingRequests.map((req) => (
              <ListRow
                key={req.id}
                icon={UserPlusIcon}
                title={req.fromProfile?.displayName || 'New request'}
                subtitle={req.message || 'Wants to be your gym buddy.'}
                trailing={
                  <View className="flex-row gap-1">
                    <Button size="sm" onPress={() => respondRequest(req.id, 'accept')}>
                      <Text>Accept</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => respondRequest(req.id, 'decline')}
                    >
                      <Text>Decline</Text>
                    </Button>
                  </View>
                }
                showChevron={false}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {outgoingRequests.length > 0 ? (
        <>
          <SectionHeader title="Pending Outgoing" />
          <ListGroup>
            {outgoingRequests.map((req) => (
              <ListRow
                key={req.id}
                title={req.toProfile?.displayName || 'Athlete'}
                subtitle={`Status: ${req.status}`}
                showChevron={false}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {/* Discover */}
      <SectionHeader
        title="Discover"
        action={
          <Button
            variant="ghost"
            size="sm"
            onPress={refreshDiscover}
            disabled={isRefreshingDiscover}
          >
            <Icon as={SearchIcon} size={14} className="text-primary" />
            <Text className="text-primary">
              {isRefreshingDiscover ? 'Searching…' : 'Refresh'}
            </Text>
          </Button>
        }
      />
      <Surface>
        <View className="gap-1.5">
          <Label>Goal</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={[{ value: 'any', label: 'Any goal' }, ...SOCIAL_GOAL_OPTIONS]}
            value={filters.goals[0] ?? 'any'}
            onValueChange={(v) =>
              setFilters({ ...filters, goals: v === 'any' ? [] : [v] })
            }
          />
        </View>
        <View className="gap-1.5">
          <Label>Experience</Label>
          <OptionChips
            layout="scroll"
            size="sm"
            items={[{ value: '', label: 'Any' }, ...SOCIAL_EXPERIENCE_OPTIONS]}
            value={filters.experienceLevel || ''}
            onValueChange={(v) => setFilters({ ...filters, experienceLevel: v })}
          />
        </View>
      </Surface>
      {discoverResults.length > 0 ? (
        <ListGroup>
          {discoverResults.slice(0, 10).map((candidate) => {
            const alreadyOutgoing = outgoingRequests.some(
              (req) => req.toUserId === candidate.userId
            );
            return (
              <ListRow
                key={candidate.userId}
                title={candidate.displayName}
                subtitle={`${candidate.experienceLevel} · ${candidate.gymDistrict || candidate.city || '—'}`}
                trailing={
                  alreadyOutgoing ? (
                    <Badge variant="outline">
                      <Text>Pending</Text>
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onPress={() => sendRequest(candidate.userId)}
                      disabled={isSendingRequest}
                    >
                      <Icon
                        as={UserPlusIcon}
                        size={14}
                        className="text-primary-foreground"
                      />
                      <Text>Add</Text>
                    </Button>
                  )
                }
                showChevron={false}
              />
            );
          })}
        </ListGroup>
      ) : (
        <Surface>
          <EmptyState
            compact
            icon={SearchIcon}
            title="No matches yet"
            description="Update your filters or expand your radius."
          />
        </Surface>
      )}

      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
    </Screen>
  );
}
