import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  buddies,
  buddyRequests,
  socialBlocks,
  socialMeetupInvites,
  socialMessages,
  socialNotifications,
  socialOneOffAvailability,
  socialRecurringAvailability,
  socialReports,
  user,
} from '@/lib/db/schema';

type UserRow = typeof user.$inferSelect;

export type SocialProfileRow = {
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
  createdAt: Date;
  updatedAt: Date;
};
export type BuddyRequestRow = typeof buddyRequests.$inferSelect;
export type BuddyRow = typeof buddies.$inferSelect;
export type SocialMessageRow = typeof socialMessages.$inferSelect;
export type SocialRecurringAvailabilityRow = typeof socialRecurringAvailability.$inferSelect;
export type SocialOneOffAvailabilityRow = typeof socialOneOffAvailability.$inferSelect;
export type SocialMeetupInviteRow = typeof socialMeetupInvites.$inferSelect;
export type SocialNotificationRow = typeof socialNotifications.$inferSelect;

export type DiscoverFilters = {
  radiusKm?: number;
  goals?: string[];
  experienceLevel?: string;
  preferredDays?: string[];
  genderPreference?: string;
  district?: string;
  language?: string;
};

export type UpsertSocialProfileInput = {
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
};

export type SendBuddyRequestInput = {
  toUserId: string;
  message?: string | null;
};

export type RespondBuddyRequestInput = {
  requestId: string;
  action: 'accept' | 'decline';
};

export type AvailabilitySlotInput = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive?: boolean;
};

export type OneOffAvailabilityInput = {
  startsAt: string;
  endsAt: string;
  status?: 'available' | 'busy';
};

export type UpdateAvailabilityInput = {
  recurringSlots: AvailabilitySlotInput[];
  oneOffSlots: OneOffAvailabilityInput[];
};

export type CreateMeetupInviteInput = {
  receiverUserId: string;
  startsAt: string;
  endsAt: string;
  gymArea: string;
  note?: string | null;
};

export type RespondMeetupInviteInput = {
  inviteId: string;
  action: 'accept' | 'decline';
};

function createId() {
  return crypto.randomUUID();
}

function normalizeTags(values: string[] | undefined) {
  if (!values || values.length === 0) {
    return '';
  }

  return values
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .join(',');
}

function parseTags(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function clampRadiusKm(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 10;
  }

  return Math.max(5, Math.min(50, Math.round(value as number)));
}

function clampMinute(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1439, Math.round(value)));
}

function normalizeDayOfWeek(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.min(7, Math.round(value)));
}

function distanceKm(latA: number, lngA: number, latB: number, lngB: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function orderUserIds(userAId: string, userBId: string) {
  return userAId < userBId ? ([userAId, userBId] as const) : ([userBId, userAId] as const);
}

async function isEitherUserBlocked(userId: string, otherUserId: string) {
  const pair = await db.query.socialBlocks.findFirst({
    where: or(
      and(eq(socialBlocks.userId, userId), eq(socialBlocks.blockedUserId, otherUserId)),
      and(eq(socialBlocks.userId, otherUserId), eq(socialBlocks.blockedUserId, userId))
    ),
  });

  return !!pair;
}

async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: string | null;
}) {
  await db.insert(socialNotifications).values({
    id: createId(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
    status: 'unread',
  });
}

function profileSupportsGoals(profileGoals: string, requestedGoals: string[] | undefined) {
  if (!requestedGoals || requestedGoals.length === 0) {
    return true;
  }

  const profileTagSet = new Set(parseTags(profileGoals));
  return requestedGoals.some((goal) => profileTagSet.has(goal.trim().toLowerCase()));
}

function profileSupportsDays(profileDays: string, requestedDays: string[] | undefined) {
  if (!requestedDays || requestedDays.length === 0) {
    return true;
  }

  const profileDaySet = new Set(parseTags(profileDays));
  return requestedDays.some((day) => profileDaySet.has(day.trim().toLowerCase()));
}

function mapUserToSocialProfile(entry: UserRow | null | undefined): SocialProfileRow | null {
  if (!entry) {
    return null;
  }

  return {
    userId: entry.id,
    experienceLevel: entry.socialExperienceLevel,
    trainingGoals: entry.socialTrainingGoals,
    preferredDays: entry.socialPreferredDays,
    preferredTimeWindows: entry.socialPreferredTimeWindows,
    genderPreference: entry.socialGenderPreference,
    gymDistrict: entry.socialGymDistrict,
    city: entry.socialCity,
    language: entry.socialLanguage,
    bio: entry.socialBio,
    isDiscoverable: entry.socialIsDiscoverable,
    isPrivateProfile: entry.socialIsPrivateProfile,
    searchRadiusKm: entry.socialSearchRadiusKm,
    areaLatE5: entry.socialAreaLatE5,
    areaLngE5: entry.socialAreaLngE5,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function getSocialProfile(userId: string) {
  const entry = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  return mapUserToSocialProfile(entry);
}

export async function upsertSocialProfile(userId: string, input: UpsertSocialProfileInput) {
  await db
    .update(user)
    .set({
      socialExperienceLevel: input.experienceLevel.trim().toLowerCase(),
      socialTrainingGoals: normalizeTags(input.trainingGoals),
      socialPreferredDays: normalizeTags(input.preferredDays),
      socialPreferredTimeWindows: normalizeTags(input.preferredTimeWindows),
      socialGenderPreference: input.genderPreference.trim().toLowerCase(),
      socialGymDistrict: input.gymDistrict.trim(),
      socialCity: input.city.trim(),
      socialLanguage: input.language.trim().toLowerCase(),
      socialBio: input.bio?.trim() || null,
      socialIsDiscoverable: input.isDiscoverable,
      socialIsPrivateProfile: input.isPrivateProfile,
      socialSearchRadiusKm: clampRadiusKm(input.searchRadiusKm),
      socialAreaLatE5: input.areaLatE5 ?? null,
      socialAreaLngE5: input.areaLngE5 ?? null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  return getSocialProfile(userId);
}

export async function discoverBuddies(userId: string, filters: DiscoverFilters) {
  const myProfile = await getSocialProfile(userId);

  if (!myProfile || !myProfile.city.trim() || !myProfile.gymDistrict.trim()) {
    throw new Error('Set up your social profile before discovering buddies.');
  }

  const blockedPairs = await db.query.socialBlocks.findMany({
    where: or(eq(socialBlocks.userId, userId), eq(socialBlocks.blockedUserId, userId)),
  });

  const blockedUserIds = new Set<string>();

  for (const pair of blockedPairs) {
    if (pair.userId === userId) {
      blockedUserIds.add(pair.blockedUserId);
    }

    if (pair.blockedUserId === userId) {
      blockedUserIds.add(pair.userId);
    }
  }

  const candidateUsers = await db.query.user.findMany({
    where: and(
      eq(user.socialIsDiscoverable, true),
      eq(user.socialIsPrivateProfile, false),
      eq(user.socialCity, myProfile.city)
    ),
    orderBy: [desc(user.updatedAt)],
    limit: 200,
  });
  const candidates = candidateUsers
    .map((entry) => mapUserToSocialProfile(entry))
    .filter((entry): entry is SocialProfileRow => !!entry);

  const radiusKm = clampRadiusKm(filters.radiusKm ?? myProfile.searchRadiusKm);
  const requestedDistrict = filters.district?.trim().toLowerCase() || null;
  const requestedLanguage = filters.language?.trim().toLowerCase() || null;
  const requestedExperience = filters.experienceLevel?.trim().toLowerCase() || null;
  const requestedGender = filters.genderPreference?.trim().toLowerCase() || null;

  const buddyRows = await db.query.buddies.findMany({
    where: or(eq(buddies.userAId, userId), eq(buddies.userBId, userId)),
  });

  const buddyUserIds = new Set<string>();

  for (const row of buddyRows) {
    buddyUserIds.add(row.userAId === userId ? row.userBId : row.userAId);
  }

  return candidates
    .filter((candidate) => {
      if (candidate.userId === userId) {
        return false;
      }

      if (blockedUserIds.has(candidate.userId)) {
        return false;
      }

      if (buddyUserIds.has(candidate.userId)) {
        return false;
      }

      if (requestedDistrict && candidate.gymDistrict.trim().toLowerCase() !== requestedDistrict) {
        return false;
      }

      if (requestedLanguage && candidate.language.trim().toLowerCase() !== requestedLanguage) {
        return false;
      }

      if (
        requestedExperience &&
        candidate.experienceLevel.trim().toLowerCase() !== requestedExperience
      ) {
        return false;
      }

      if (requestedGender && candidate.genderPreference.trim().toLowerCase() !== requestedGender) {
        return false;
      }

      if (!profileSupportsGoals(candidate.trainingGoals, filters.goals)) {
        return false;
      }

      if (!profileSupportsDays(candidate.preferredDays, filters.preferredDays)) {
        return false;
      }

      if (
        myProfile.areaLatE5 !== null &&
        myProfile.areaLngE5 !== null &&
        candidate.areaLatE5 !== null &&
        candidate.areaLngE5 !== null
      ) {
        const km = distanceKm(
          myProfile.areaLatE5 / 100000,
          myProfile.areaLngE5 / 100000,
          candidate.areaLatE5 / 100000,
          candidate.areaLngE5 / 100000
        );

        if (km > radiusKm) {
          return false;
        }
      }

      return true;
    })
    .slice(0, 50);
}

export async function listBuddyRequests(userId: string) {
  const incoming = await db.query.buddyRequests.findMany({
    where: and(eq(buddyRequests.toUserId, userId), eq(buddyRequests.status, 'pending')),
    orderBy: [desc(buddyRequests.updatedAt)],
  });

  const outgoing = await db.query.buddyRequests.findMany({
    where: and(eq(buddyRequests.fromUserId, userId), eq(buddyRequests.status, 'pending')),
    orderBy: [desc(buddyRequests.updatedAt)],
  });

  return { incoming, outgoing };
}

export async function sendBuddyRequest(userId: string, input: SendBuddyRequestInput) {
  const toUserId = input.toUserId.trim();

  if (!toUserId || toUserId === userId) {
    throw new Error('toUserId must be another user.');
  }

  if (await isEitherUserBlocked(userId, toUserId)) {
    throw new Error('Cannot request this user due to block settings.');
  }

  const [userAId, userBId] = orderUserIds(userId, toUserId);

  const existingBuddy = await db.query.buddies.findFirst({
    where: and(eq(buddies.userAId, userAId), eq(buddies.userBId, userBId)),
  });

  if (existingBuddy) {
    throw new Error('You are already connected as buddies.');
  }

  const reversePending = await db.query.buddyRequests.findFirst({
    where: and(
      eq(buddyRequests.fromUserId, toUserId),
      eq(buddyRequests.toUserId, userId),
      eq(buddyRequests.status, 'pending')
    ),
  });

  if (reversePending) {
    return db.transaction(async (tx) => {
      await tx
        .update(buddyRequests)
        .set({
          status: 'accepted',
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(buddyRequests.id, reversePending.id));

      await tx
        .insert(buddies)
        .values({
          id: createId(),
          userAId,
          userBId,
        })
        .onConflictDoNothing();

      await createNotification({
        userId: toUserId,
        type: 'buddy_request_accepted',
        title: 'Buddy request accepted',
        body: 'You are now connected as gym buddies.',
        data: JSON.stringify({ byUserId: userId }),
      });

      return {
        autoAccepted: true,
        requestId: reversePending.id,
      };
    });
  }

  const requestId = createId();

  await db
    .insert(buddyRequests)
    .values({
      id: requestId,
      fromUserId: userId,
      toUserId,
      status: 'pending',
      message: input.message?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [buddyRequests.fromUserId, buddyRequests.toUserId],
      set: {
        status: 'pending',
        message: input.message?.trim() || null,
        respondedAt: null,
        updatedAt: new Date(),
      },
    });

  await createNotification({
    userId: toUserId,
    type: 'buddy_request_received',
    title: 'New buddy request',
    body: 'Someone wants to train with you.',
    data: JSON.stringify({ fromUserId: userId }),
  });

  return {
    autoAccepted: false,
    requestId,
  };
}

export async function respondToBuddyRequest(userId: string, input: RespondBuddyRequestInput) {
  const request = await db.query.buddyRequests.findFirst({
    where: and(eq(buddyRequests.id, input.requestId), eq(buddyRequests.toUserId, userId)),
  });

  if (!request) {
    throw new Error('Buddy request not found.');
  }

  if (request.status !== 'pending') {
    throw new Error('Buddy request is no longer pending.');
  }

  if (input.action === 'accept') {
    const [userAId, userBId] = orderUserIds(request.fromUserId, request.toUserId);

    await db.transaction(async (tx) => {
      await tx
        .update(buddyRequests)
        .set({
          status: 'accepted',
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(buddyRequests.id, request.id));

      await tx
        .insert(buddies)
        .values({
          id: createId(),
          userAId,
          userBId,
        })
        .onConflictDoNothing();
    });

    await createNotification({
      userId: request.fromUserId,
      type: 'buddy_request_accepted',
      title: 'Request accepted',
      body: 'You are now connected as gym buddies.',
      data: JSON.stringify({ byUserId: userId }),
    });
  } else {
    await db
      .update(buddyRequests)
      .set({
        status: 'declined',
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(buddyRequests.id, request.id));

    await createNotification({
      userId: request.fromUserId,
      type: 'buddy_request_declined',
      title: 'Request declined',
      body: 'Your buddy request was declined.',
      data: JSON.stringify({ byUserId: userId }),
    });
  }

  return db.query.buddyRequests.findFirst({
    where: eq(buddyRequests.id, request.id),
  });
}

export async function listBuddies(userId: string) {
  return db.query.buddies.findMany({
    where: or(eq(buddies.userAId, userId), eq(buddies.userBId, userId)),
    orderBy: [desc(buddies.connectedAt)],
  });
}

async function getBuddyConnection(userId: string, buddyUserId: string) {
  const [userAId, userBId] = orderUserIds(userId, buddyUserId);

  return db.query.buddies.findFirst({
    where: and(eq(buddies.userAId, userAId), eq(buddies.userBId, userBId)),
  });
}

export async function listMessages(userId: string, buddyUserId: string) {
  if (await isEitherUserBlocked(userId, buddyUserId)) {
    throw new Error('Messaging is unavailable for this user.');
  }

  const buddyConnection = await getBuddyConnection(userId, buddyUserId);

  if (!buddyConnection) {
    throw new Error('Only buddies can message each other.');
  }

  return db.query.socialMessages.findMany({
    where: eq(socialMessages.buddyId, buddyConnection.id),
    orderBy: [asc(socialMessages.createdAt)],
  });
}

export async function sendMessage(userId: string, buddyUserId: string, body: string) {
  if (await isEitherUserBlocked(userId, buddyUserId)) {
    throw new Error('Messaging is unavailable for this user.');
  }

  const buddyConnection = await getBuddyConnection(userId, buddyUserId);

  if (!buddyConnection) {
    throw new Error('Only buddies can message each other.');
  }

  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error('Message body is required.');
  }

  const inserted = await db
    .insert(socialMessages)
    .values({
      id: createId(),
      buddyId: buddyConnection.id,
      senderUserId: userId,
      body: cleanBody,
    })
    .returning();

  await createNotification({
    userId: buddyUserId,
    type: 'new_message',
    title: 'New message',
    body: cleanBody.length > 60 ? `${cleanBody.slice(0, 57)}...` : cleanBody,
    data: JSON.stringify({ fromUserId: userId }),
  });

  return inserted[0] ?? null;
}

export async function getAvailability(userId: string) {
  const recurring = await db.query.socialRecurringAvailability.findMany({
    where: eq(socialRecurringAvailability.userId, userId),
    orderBy: [
      asc(socialRecurringAvailability.dayOfWeek),
      asc(socialRecurringAvailability.startMinute),
    ],
  });

  const oneOff = await db.query.socialOneOffAvailability.findMany({
    where: eq(socialOneOffAvailability.userId, userId),
    orderBy: [asc(socialOneOffAvailability.startsAt)],
  });

  return {
    recurring,
    oneOff,
  };
}

export async function updateAvailability(userId: string, input: UpdateAvailabilityInput) {
  const recurringSlots = input.recurringSlots
    .map((slot) => ({
      id: createId(),
      userId,
      dayOfWeek: normalizeDayOfWeek(slot.dayOfWeek),
      startMinute: clampMinute(slot.startMinute),
      endMinute: clampMinute(slot.endMinute),
      isActive: slot.isActive ?? true,
    }))
    .filter((slot) => slot.endMinute > slot.startMinute);

  const oneOffSlots = input.oneOffSlots
    .map((slot) => {
      const startsAt = new Date(slot.startsAt);
      const endsAt = new Date(slot.endsAt);
      return {
        id: createId(),
        userId,
        startsAt,
        endsAt,
        status: slot.status ?? 'available',
      };
    })
    .filter(
      (slot) =>
        !Number.isNaN(slot.startsAt.getTime()) &&
        !Number.isNaN(slot.endsAt.getTime()) &&
        slot.endsAt > slot.startsAt
    );

  await db.transaction(async (tx) => {
    await tx
      .delete(socialRecurringAvailability)
      .where(eq(socialRecurringAvailability.userId, userId));
    await tx.delete(socialOneOffAvailability).where(eq(socialOneOffAvailability.userId, userId));

    if (recurringSlots.length > 0) {
      await tx.insert(socialRecurringAvailability).values(recurringSlots);
    }

    if (oneOffSlots.length > 0) {
      await tx.insert(socialOneOffAvailability).values(oneOffSlots);
    }
  });

  return getAvailability(userId);
}

export async function listMeetupInvites(userId: string) {
  const incoming = await db.query.socialMeetupInvites.findMany({
    where: eq(socialMeetupInvites.receiverUserId, userId),
    orderBy: [desc(socialMeetupInvites.createdAt)],
  });

  const outgoing = await db.query.socialMeetupInvites.findMany({
    where: eq(socialMeetupInvites.senderUserId, userId),
    orderBy: [desc(socialMeetupInvites.createdAt)],
  });

  return { incoming, outgoing };
}

export async function createMeetupInvite(userId: string, input: CreateMeetupInviteInput) {
  if (await isEitherUserBlocked(userId, input.receiverUserId)) {
    throw new Error('Cannot invite this user due to block settings.');
  }

  const buddyConnection = await getBuddyConnection(userId, input.receiverUserId);

  if (!buddyConnection) {
    throw new Error('Only buddies can receive meetup invites.');
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new Error('startsAt and endsAt must be valid timestamps.');
  }

  const inserted = await db
    .insert(socialMeetupInvites)
    .values({
      id: createId(),
      senderUserId: userId,
      receiverUserId: input.receiverUserId,
      startsAt,
      endsAt,
      gymArea: input.gymArea.trim(),
      note: input.note?.trim() || null,
      status: 'pending',
    })
    .returning();

  await createNotification({
    userId: input.receiverUserId,
    type: 'meetup_invite_received',
    title: 'New meetup invite',
    body: 'You received a new training meetup invite.',
    data: JSON.stringify({ fromUserId: userId }),
  });

  return inserted[0] ?? null;
}

export async function respondToMeetupInvite(userId: string, input: RespondMeetupInviteInput) {
  const invite = await db.query.socialMeetupInvites.findFirst({
    where: and(
      eq(socialMeetupInvites.id, input.inviteId),
      eq(socialMeetupInvites.receiverUserId, userId)
    ),
  });

  if (!invite) {
    throw new Error('Meetup invite not found.');
  }

  if (invite.status !== 'pending') {
    throw new Error('Meetup invite is no longer pending.');
  }

  const nextStatus = input.action === 'accept' ? 'accepted' : 'declined';

  const updatedRows = await db
    .update(socialMeetupInvites)
    .set({
      status: nextStatus,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(socialMeetupInvites.id, invite.id))
    .returning();

  await createNotification({
    userId: invite.senderUserId,
    type: nextStatus === 'accepted' ? 'meetup_invite_accepted' : 'meetup_invite_declined',
    title: nextStatus === 'accepted' ? 'Meetup accepted' : 'Meetup declined',
    body:
      nextStatus === 'accepted'
        ? 'Your meetup invite was accepted.'
        : 'Your meetup invite was declined.',
    data: JSON.stringify({ byUserId: userId }),
  });

  return updatedRows[0] ?? null;
}

export async function listNotifications(userId: string) {
  return db.query.socialNotifications.findMany({
    where: eq(socialNotifications.userId, userId),
    orderBy: [desc(socialNotifications.createdAt)],
    limit: 100,
  });
}

export async function markNotificationsRead(userId: string, notificationIds: string[]) {
  const ids = notificationIds.map((entry) => entry.trim()).filter((entry) => entry.length > 0);

  if (ids.length === 0) {
    return listNotifications(userId);
  }

  await db
    .update(socialNotifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(and(eq(socialNotifications.userId, userId), inArray(socialNotifications.id, ids)));

  return listNotifications(userId);
}

export async function blockUser(userId: string, blockedUserId: string, reason?: string | null) {
  if (!blockedUserId || blockedUserId === userId) {
    throw new Error('blockedUserId must be another user.');
  }

  await db
    .insert(socialBlocks)
    .values({
      id: createId(),
      userId,
      blockedUserId,
      reason: reason?.trim() || null,
    })
    .onConflictDoNothing();

  await db
    .update(buddyRequests)
    .set({
      status: 'blocked',
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      or(
        and(eq(buddyRequests.fromUserId, userId), eq(buddyRequests.toUserId, blockedUserId)),
        and(eq(buddyRequests.fromUserId, blockedUserId), eq(buddyRequests.toUserId, userId))
      )
    );

  const [userAId, userBId] = orderUserIds(userId, blockedUserId);

  await db.delete(buddies).where(and(eq(buddies.userAId, userAId), eq(buddies.userBId, userBId)));

  return {
    success: true,
  };
}

export async function reportUser(
  userId: string,
  reportedUserId: string,
  category: string,
  details?: string | null
) {
  if (!reportedUserId || reportedUserId === userId) {
    throw new Error('reportedUserId must be another user.');
  }

  const inserted = await db
    .insert(socialReports)
    .values({
      id: createId(),
      reporterUserId: userId,
      reportedUserId,
      category: category.trim().toLowerCase() || 'other',
      details: details?.trim() || null,
      status: 'open',
    })
    .returning();

  return inserted[0] ?? null;
}
