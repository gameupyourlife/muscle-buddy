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
import { UserAvatar } from '@/components/ui/user-avatar';
import { authClient } from '@/lib/auth-client';
import {
    SOCIAL_EXPERIENCE_OPTIONS,
    SOCIAL_GOAL_OPTIONS,
    useSocialData,
} from '@/lib/workouts/use-social';
import { useRouter } from 'expo-router';
import {
    CalendarPlusIcon,
    MessageCircleIcon,
    SearchIcon,
    Settings2Icon,
    ShieldAlertIcon,
    UserPlusIcon,
    UserXIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

export default function BuddiesScreen() {
  const router = useRouter();
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
    isRefreshingDiscover,
    isSendingRequest,
    isSendingMessage,
    feedback,
    errorMessage,
    refreshNow,
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
  const { data: session } = authClient.useSession();
  const authDisplayName = session?.user?.name || session?.user?.email || 'Set up your profile';

  const [chatDraft, setChatDraft] = useState('');
  const [meetupBuddyId, setMeetupBuddyId] = useState<string | null>(null);
  const [meetupNote, setMeetupNote] = useState('');
  const [meetupGym, setMeetupGym] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === 'unread').length,
    [notifications]
  );

  const activeBuddy = buddies.find((b) => b.buddyUserId === activeBuddyUserId);

  const submitMeetup = async (buddyUserId: string) => {
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    await createMeetup({
      receiverUserId: buddyUserId,
      startsAt,
      endsAt,
      gymArea: meetupGym.trim() || profile?.gymDistrict || 'Main gym',
      note: meetupNote.trim() || null,
    });
    setMeetupBuddyId(null);
    setMeetupNote('');
    setMeetupGym('');
  };

  return (
    <Screen
      refreshing={isLoading}
      onRefresh={refreshNow}
      contentContainerStyle={{ paddingTop: 8 }}
    >
      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
      {/* Buddy profile summary */}
      <Surface>
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-3 flex-1">
            <UserAvatar name={authDisplayName} size={44} />
            <View className="flex-1">
              <Text className="text-[16px] font-semibold text-foreground" numberOfLines={1}>
                {authDisplayName}
              </Text>
              <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                {profile
                  ? `${profile.experienceLevel} · ${profile.city || 'no city'}${
                      profile.isDiscoverable ? '' : ' · hidden'
                    }`
                  : 'Required to discover buddies'}
              </Text>
            </View>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(home)/me',
                params: {
                  focus: 'buddy-profile',
                  focusNonce: String(Date.now()),
                },
              })
            }
          >
            <Icon as={Settings2Icon} size={16} className="text-foreground" />
            <Text>Profile settings</Text>
          </Button>
        </View>
        <View className="flex-row flex-wrap gap-2 pt-2 border-t-hairline border-separator">
          <Badge variant={profile?.isDiscoverable ? 'default' : 'outline'}>
            <Text>{profile?.isDiscoverable ? 'Discoverable' : 'Hidden from discover'}</Text>
          </Badge>
          <Badge variant="outline">
            <Text>{profile?.isPrivateProfile ? 'Private profile' : 'Public profile'}</Text>
          </Badge>
          {profile?.city ? (
            <Badge variant="outline">
              <Text>{profile.city}</Text>
            </Badge>
          ) : null}
        </View>
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
              title={buddy.preview?.displayName || 'Buddy'}
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
            title={`Chat · ${activeBuddy.preview?.displayName || 'Buddy'}`}
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
                onPress={() => {
                  const name = activeBuddy.preview?.displayName || 'this buddy';
                  Alert.alert(
                    'Block this buddy?',
                    `${name} will no longer be able to see your profile, message you, or send meetup invites.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Block',
                        style: 'destructive',
                        onPress: () => void blockBuddyUser(activeBuddy.buddyUserId),
                      },
                    ],
                  );
                }}
              >
                <Icon as={UserXIcon} size={14} className="text-destructive" />
                <Text className="text-destructive">Block</Text>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  Alert.alert(
                    'Report this buddy?',
                    'Our team will review their profile and recent interactions. They will not be notified.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Report',
                        style: 'destructive',
                        onPress: () =>
                          void reportBuddyUser(activeBuddy.buddyUserId, 'inappropriate'),
                      },
                    ],
                  );
                }}
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
            <Input
              value={meetupGym}
              onChangeText={setMeetupGym}
              placeholder={profile?.gymDistrict || 'Main gym'}
            />
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
            onPress={() => {
              void refreshDiscover();
            }}
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
              (req) => req.toUserId === candidate.profile.userId && req.status === 'pending'
            );
            return (
              <ListRow
                key={candidate.profile.userId}
                title={candidate.preview?.displayName || 'Athlete'}
                subtitle={`${candidate.profile.experienceLevel} · ${candidate.profile.gymDistrict || candidate.profile.city || '—'}`}
                trailing={
                  alreadyOutgoing ? (
                    <Badge variant="outline">
                      <Text>Pending</Text>
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onPress={() => sendRequest(candidate.profile.userId)}
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
    </Screen>
  );
}
