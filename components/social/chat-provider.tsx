import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRow } from '@/components/ui/list-row';
import { OptionChips } from '@/components/ui/option-chips';
import { ListGroup, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useSocialData } from '@/lib/workouts/use-social';
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  MessageCircleIcon,
  ShieldAlertIcon,
  UserXIcon,
} from 'lucide-react-native';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatContextValue = {
  openChatInbox: () => void;
  openConversation: (buddyUserId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const MEETUP_DAY_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'day-after', label: 'Day after' },
];

const MEETUP_TIME_OPTIONS = [
  { value: '07:00', label: '07:00' },
  { value: '12:00', label: '12:00' },
  { value: '17:00', label: '17:00' },
  { value: '19:00', label: '19:00' },
];

const MEETUP_DURATION_OPTIONS = [
  { value: '60', label: '1 h' },
  { value: '90', label: '1.5 h' },
  { value: '120', label: '2 h' },
];

function getMeetupStart(day: string, time: string) {
  const next = new Date();
  const dayOffset = day === 'tomorrow' ? 1 : day === 'day-after' ? 2 : 0;
  const [hours, minutes] = time.split(':').map(Number);
  next.setDate(next.getDate() + dayOffset);
  next.setHours(hours, minutes, 0, 0);

  if (day === 'today' && next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function ChatProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const {
    profile,
    buddies,
    meetupIncoming,
    meetupOutgoing,
    messages,
    notifications,
    activeBuddyUserId,
    isLoading,
    isSendingMessage,
    loadInitialData,
    openChat,
    sendChatMessage,
    createMeetup,
    respondMeetup,
    markMessageNotificationsRead,
    blockBuddyUser,
    reportBuddyUser,
    setActiveBuddyUserId,
  } = useSocialData();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isPlanningMeetup, setIsPlanningMeetup] = useState(false);
  const [meetupDay, setMeetupDay] = useState('tomorrow');
  const [meetupTime, setMeetupTime] = useState('19:00');
  const [meetupDuration, setMeetupDuration] = useState('90');
  const [meetupGym, setMeetupGym] = useState('');
  const [meetupNote, setMeetupNote] = useState('');

  const activeBuddy = buddies.find((buddy) => buddy.buddyUserId === activeBuddyUserId);
  const unreadMessageCount = notifications.filter(
    (notification) => notification.status === 'unread' && notification.type === 'new_message'
  ).length;
  const meetupStartPreview = getMeetupStart(meetupDay, meetupTime);
  const meetupEndPreview = new Date(
    meetupStartPreview.getTime() + Number(meetupDuration) * 60 * 1000
  );
  const visibleChatBuddies = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    if (!query) {
      return buddies;
    }

    return buddies.filter((buddy) => {
      const name = buddy.preview?.displayName || '';
      const city = buddy.profile?.city || '';
      return `${name} ${city}`.toLowerCase().includes(query);
    });
  }, [buddies, chatSearch]);
  const activeBuddyMeetups = useMemo(() => {
    if (!activeBuddy) {
      return [];
    }

    return [
      ...meetupIncoming.filter((invite) => invite.senderUserId === activeBuddy.buddyUserId),
      ...meetupOutgoing.filter((invite) => invite.receiverUserId === activeBuddy.buddyUserId),
    ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [activeBuddy, meetupIncoming, meetupOutgoing]);

  useEffect(() => {
    void loadInitialData({ force: true, silent: true });
  }, [loadInitialData]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates.height - insets.bottom));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const resetMeetupComposer = () => {
    setIsPlanningMeetup(false);
    setMeetupDay('tomorrow');
    setMeetupTime('19:00');
    setMeetupDuration('90');
    setMeetupGym('');
    setMeetupNote('');
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setChatSearch('');
    setChatDraft('');
    setKeyboardInset(0);
    resetMeetupComposer();
    setActiveBuddyUserId(null);
  };

  const openChatInbox = () => {
    setIsChatOpen(true);
    setActiveBuddyUserId(null);
    void loadInitialData({ force: true, silent: true });
  };

  const openConversation = async (buddyUserId: string) => {
    setIsChatOpen(true);
    resetMeetupComposer();
    await openChat(buddyUserId);
    await markMessageNotificationsRead(buddyUserId);
  };

  const submitMeetup = async () => {
    if (!activeBuddy) {
      return;
    }

    const startsAt = getMeetupStart(meetupDay, meetupTime);
    const endsAt = new Date(startsAt.getTime() + Number(meetupDuration) * 60 * 1000);

    await createMeetup({
      receiverUserId: activeBuddy.buddyUserId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      gymArea: meetupGym.trim() || profile?.gymDistrict || 'Main gym',
      note: meetupNote.trim() || null,
    });
    resetMeetupComposer();
  };

  return (
    <ChatContext.Provider value={{ openChatInbox, openConversation }}>
      <View className="flex-1">
        {children}

        <Button
          size="icon"
          className="absolute right-4 h-14 w-14 rounded-full"
          style={{ bottom: insets.bottom + 72 }}
          onPress={openChatInbox}>
          <Icon as={MessageCircleIcon} size={23} className="text-primary-foreground" />
        </Button>
        {unreadMessageCount > 0 ? (
          <View
            className="absolute right-3 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5"
            style={{ bottom: insets.bottom + 112, height: 20 }}>
            <Text className="text-[11px] font-semibold text-white">
              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
            </Text>
          </View>
        ) : null}

        <Modal visible={isChatOpen} animationType="slide" onRequestClose={closeChat}>
          <View
            className="flex-1 bg-background px-4"
            style={{
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24 + keyboardInset,
            }}>
            {activeBuddy ? (
              <View className="flex-1 gap-4">
                <View className="flex-row items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => {
                      setActiveBuddyUserId(null);
                      setChatDraft('');
                      resetMeetupComposer();
                    }}>
                    <Icon as={ArrowLeftIcon} size={20} className="text-foreground" />
                  </Button>
                  <UserAvatar
                    name={activeBuddy.preview?.displayName}
                    imageUrl={activeBuddy.preview?.image}
                    size={40}
                  />
                  <View className="flex-1">
                    <Text className="text-[17px] font-semibold text-foreground" numberOfLines={1}>
                      {activeBuddy.preview?.displayName || 'Buddy'}
                    </Text>
                    <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                      {activeBuddy.profile
                        ? `${activeBuddy.profile.experienceLevel} · ${activeBuddy.profile.city || '—'}`
                        : 'Connected'}
                    </Text>
                  </View>
                  <Button variant="ghost" size="sm" onPress={closeChat}>
                    <Text>Close</Text>
                  </Button>
                </View>

                <Surface
                  className="flex-1"
                  padded={false}
                  style={keyboardInset > 0 ? { maxHeight: '72%' } : undefined}>
                  <ScrollView
                    className="flex-1"
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: 'flex-end',
                      gap: 8,
                      padding: 16,
                    }}
                    keyboardShouldPersistTaps="handled">
                    {messages.length === 0 && activeBuddyMeetups.length === 0 ? (
                      <Text className="py-4 text-center text-[13px] text-muted-foreground">
                        No messages yet. Say hi.
                      </Text>
                    ) : (
                      messages.slice(-24).map((message) => {
                        const mine = message.senderUserId !== activeBuddy.buddyUserId;
                        return (
                          <View
                            key={message.id}
                            className={
                              'max-w-[80%] rounded-2xl px-3 py-2 ' +
                              (mine ? 'self-end bg-primary' : 'self-start bg-surface-muted')
                            }
                            style={{ borderCurve: 'continuous' }}>
                            <Text
                              className={mine ? 'text-primary-foreground' : 'text-foreground'}
                              selectable>
                              {message.body}
                            </Text>
                          </View>
                        );
                      })
                    )}
                    {activeBuddyMeetups.map((invite) => {
                      const isIncoming = invite.senderUserId === activeBuddy.buddyUserId;

                      return (
                        <View
                          key={invite.id}
                          className={
                            'w-full gap-2 rounded-2xl border px-3 py-3 ' +
                            (isIncoming
                              ? 'border-primary/20 bg-primary/10'
                              : 'border-separator bg-surface-muted')
                          }
                          style={{ borderCurve: 'continuous' }}>
                          <View className="flex-row items-center gap-2">
                            <Icon as={CalendarPlusIcon} size={16} className="text-primary" />
                            <Text className="text-[14px] font-semibold text-foreground">
                              {isIncoming ? 'Meetup invite' : 'Meetup invite sent'}
                            </Text>
                          </View>
                          <Text className="text-[14px] text-foreground">
                            {new Date(invite.startsAt).toLocaleString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' - '}
                            {new Date(invite.endsAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                          <Text className="text-[13px] text-muted-foreground">
                            {invite.gymArea}
                            {invite.note ? ` · ${invite.note}` : ''}
                          </Text>
                          {invite.status === 'pending' && isIncoming ? (
                            <View className="flex-row gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onPress={() => respondMeetup(invite.id, 'accept')}>
                                <Text>Accept</Text>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onPress={() => respondMeetup(invite.id, 'decline')}>
                                <Text>Decline</Text>
                              </Button>
                            </View>
                          ) : invite.status === 'accepted' ? (
                            <Text className="text-[13px] font-medium text-success">Accepted</Text>
                          ) : invite.status === 'declined' ? (
                            <Text className="text-[13px] font-medium text-muted-foreground">
                              Declined
                            </Text>
                          ) : (
                            <Text className="text-[13px] text-muted-foreground">
                              Waiting for reply
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </Surface>

                {isPlanningMeetup ? (
                  <Surface>
                    <View className="gap-1">
                      <Text className="text-[15px] font-semibold text-foreground">Plan meetup</Text>
                      <Text className="text-[13px] text-muted-foreground">
                        Pick a time that is easy to scan before sending.
                      </Text>
                    </View>
                    <View className="gap-1.5">
                      <Label>Day</Label>
                      <OptionChips
                        layout="scroll"
                        size="sm"
                        items={MEETUP_DAY_OPTIONS}
                        value={meetupDay}
                        onValueChange={setMeetupDay}
                      />
                    </View>
                    <View className="gap-1.5">
                      <Label>Start</Label>
                      <OptionChips
                        layout="scroll"
                        size="sm"
                        items={MEETUP_TIME_OPTIONS}
                        value={meetupTime}
                        onValueChange={setMeetupTime}
                      />
                    </View>
                    <View className="gap-1.5">
                      <Label>Duration</Label>
                      <OptionChips
                        layout="scroll"
                        size="sm"
                        items={MEETUP_DURATION_OPTIONS}
                        value={meetupDuration}
                        onValueChange={setMeetupDuration}
                      />
                    </View>
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
                      <Input
                        value={meetupNote}
                        onChangeText={setMeetupNote}
                        placeholder="Leg day?"
                      />
                    </View>
                    <View className="rounded-xl bg-surface-muted px-3 py-2">
                      <Text className="text-[13px] text-muted-foreground">Invite preview</Text>
                      <Text className="text-[14px] font-medium text-foreground">
                        {meetupStartPreview.toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' - '}
                        {meetupEndPreview.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Button variant="outline" className="flex-1" onPress={resetMeetupComposer}>
                        <Text>Cancel</Text>
                      </Button>
                      <Button className="flex-1" onPress={submitMeetup}>
                        <Text>Send invite</Text>
                      </Button>
                    </View>
                  </Surface>
                ) : null}

                <View className="gap-3">
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Input
                        value={chatDraft}
                        onChangeText={setChatDraft}
                        placeholder="Message"
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
                      disabled={isSendingMessage || !chatDraft.trim()}>
                      <Text>{isSendingMessage ? '...' : 'Send'}</Text>
                    </Button>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setIsPlanningMeetup((current) => !current)}>
                      <Icon as={CalendarPlusIcon} size={14} className="text-foreground" />
                      <Text>{isPlanningMeetup ? 'Hide meetup' : 'Plan meetup'}</Text>
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
                          ]
                        );
                      }}>
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
                          ]
                        );
                      }}>
                      <Icon as={ShieldAlertIcon} size={14} className="text-destructive" />
                      <Text className="text-destructive">Report</Text>
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <View className="flex-1 gap-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View>
                    <Text className="text-[24px] font-semibold text-foreground">Chats</Text>
                    <Text className="text-[13px] text-muted-foreground">
                      {buddies.length} contact{buddies.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  <Button variant="ghost" size="sm" onPress={closeChat}>
                    <Text>Close</Text>
                  </Button>
                </View>

                <Input value={chatSearch} onChangeText={setChatSearch} placeholder="Search chats" />

                <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
                  {visibleChatBuddies.length > 0 ? (
                    <ListGroup>
                      {visibleChatBuddies.map((buddy) => (
                        <ListRow
                          key={buddy.id}
                          leading={
                            <UserAvatar
                              name={buddy.preview?.displayName}
                              imageUrl={buddy.preview?.image}
                              size={40}
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
                        icon={MessageCircleIcon}
                        title={
                          isLoading
                            ? 'Loading chats'
                            : buddies.length === 0
                              ? 'No chats yet'
                              : 'No matching chats'
                        }
                        description={
                          isLoading
                            ? 'Fetching your contacts.'
                            : buddies.length === 0
                              ? 'Accepted buddies will appear here.'
                              : 'Try another name or city.'
                        }
                      />
                    </Surface>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </ChatContext.Provider>
  );
}

function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used within ChatProvider.');
  }

  return context;
}

export { ChatProvider, useChat };
