import { useChat } from '@/components/social/chat-provider';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
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
import { Clock3Icon, SearchIcon, Settings2Icon, UserPlusIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

export default function BuddiesScreen() {
  const router = useRouter();
  const { openConversation } = useChat();
  const {
    profile,
    discoverResults,
    incomingRequests,
    outgoingRequests,
    buddies,
    notifications,
    filters,
    isLoading,
    isRefreshingDiscover,
    isSendingRequest,
    feedback,
    errorMessage,
    refreshNow,
    refreshDiscover,
    sendRequest,
    respondRequest,
    setFilters,
  } = useSocialData();
  const { data: session } = authClient.useSession();
  const authDisplayName = session?.user?.name || session?.user?.email || 'Set up your profile';

  const unreadBuddyRequestCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          notification.status === 'unread' && notification.type === 'buddy_request_received'
      ).length,
    [notifications]
  );
  const pendingActionCount = incomingRequests.length;
  const waitingCount = outgoingRequests.length;

  return (
    <View className="flex-1">
      <Screen
        refreshing={isLoading}
        onRefresh={refreshNow}
        contentContainerStyle={{ paddingTop: 8 }}>
        {feedback ? <Banner tone="success" message={feedback} /> : null}
        {errorMessage ? <Banner tone="destructive" message={errorMessage} /> : null}
        {/* Buddy overview */}
        <Surface>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-3">
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
              }>
              <Icon as={Settings2Icon} size={16} className="text-foreground" />
              <Text>Profile settings</Text>
            </Button>
          </View>
          <View className="flex-row flex-wrap gap-2 border-t-hairline border-separator pt-2">
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
          <View className="flex-row overflow-hidden rounded-xl border border-separator bg-surface-muted">
            <View className="flex-1 items-center gap-0.5 py-2.5">
              <Text className="text-[18px] font-semibold text-foreground">{buddies.length}</Text>
              <Text className="text-[12px] text-muted-foreground">Buddies</Text>
            </View>
            <View className="border-l-hairline border-separator" />
            <View className="flex-1 items-center gap-0.5 py-2.5">
              <Text className="text-[18px] font-semibold text-foreground">
                {pendingActionCount}
              </Text>
              <Text className="text-[12px] text-muted-foreground">To review</Text>
            </View>
            <View className="border-l-hairline border-separator" />
            <View className="flex-1 items-center gap-0.5 py-2.5">
              <Text className="text-[18px] font-semibold text-foreground">{waitingCount}</Text>
              <Text className="text-[12px] text-muted-foreground">Waiting</Text>
            </View>
          </View>
        </Surface>

        {unreadBuddyRequestCount > 0 ? (
          <Banner
            tone="info"
            title={`${unreadBuddyRequestCount} new buddy request${
              unreadBuddyRequestCount === 1 ? '' : 's'
            }`}
            message="Review your pending buddy requests below."
          />
        ) : null}

        {/* Needs attention */}
        {pendingActionCount > 0 ? (
          <>
            <SectionHeader
              title="Needs Attention"
              description={`${pendingActionCount} item${pendingActionCount === 1 ? '' : 's'} ready for a decision`}
            />
            <ListGroup>
              {incomingRequests.map((req) => (
                <ListRow
                  key={req.id}
                  icon={UserPlusIcon}
                  title={req.fromProfile?.displayName || 'New buddy request'}
                  subtitle={req.message || 'Wants to be your gym buddy.'}
                  trailing={
                    <View className="flex-row gap-1">
                      <Button size="sm" onPress={() => respondRequest(req.id, 'accept')}>
                        <Text>Accept</Text>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() => respondRequest(req.id, 'decline')}>
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

        {/* Buddies */}
        <SectionHeader
          title="Your Buddies"
          description={
            buddies.length === 0
              ? 'Start with discover to find someone nearby.'
              : `${buddies.length} connected`
          }
        />
        {buddies.length > 0 ? (
          <ListGroup>
            {buddies.map((buddy) => (
              <ListRow
                key={buddy.id}
                leading={
                  <UserAvatar
                    name={buddy.preview?.displayName}
                    imageUrl={buddy.preview?.image}
                    size={36}
                  />
                }
                title={buddy.preview?.displayName || 'Buddy'}
                subtitle={
                  buddy.profile
                    ? `${buddy.profile.experienceLevel} · ${buddy.profile.city || '—'}`
                    : 'Connected'
                }
                onPress={() => openConversation(buddy.buddyUserId)}
              />
            ))}
          </ListGroup>
        ) : (
          <Surface>
            <EmptyState
              compact
              icon={UserPlusIcon}
              title="No buddies yet"
              description="Browse matches below and send your first buddy request."
            />
          </Surface>
        )}

        {/* Discover */}
        <SectionHeader
          title="Discover"
          description={
            discoverResults.length === 0
              ? 'Find athletes who match your preferences.'
              : `${discoverResults.length} match${discoverResults.length === 1 ? '' : 'es'} found`
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                void refreshDiscover();
              }}
              disabled={isRefreshingDiscover}>
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
              onValueChange={(v) => setFilters({ ...filters, goals: v === 'any' ? [] : [v] })}
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
                        disabled={isSendingRequest}>
                        <Icon as={UserPlusIcon} size={14} className="text-primary-foreground" />
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

        {/* Waiting on others */}
        {waitingCount > 0 ? (
          <>
            <SectionHeader
              title="Waiting On Others"
              description="Buddy requests you already sent."
            />
            <ListGroup>
              {outgoingRequests.map((req) => (
                <ListRow
                  key={req.id}
                  icon={Clock3Icon}
                  title={req.toProfile?.displayName || 'Athlete'}
                  subtitle="Buddy request pending"
                  showChevron={false}
                />
              ))}
            </ListGroup>
          </>
        ) : null}
      </Screen>
    </View>
  );
}
