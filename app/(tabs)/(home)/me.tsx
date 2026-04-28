import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRow } from '@/components/ui/list-row';
import { ListGroup, Screen, SectionHeader, Surface } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { authClient } from '@/lib/auth-client';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
    HammerIcon,
    LogOutIcon,
    ShieldCheckIcon,
    Trash2Icon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

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

export default function MeScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [profileFb, setProfileFb] = useState<Feedback>(null);
  const [emailFb, setEmailFb] = useState<Feedback>(null);
  const [passwordFb, setPasswordFb] = useState<Feedback>(null);
  const [sessionFb, setSessionFb] = useState<Feedback>(null);
  const [deleteFb, setDeleteFb] = useState<Feedback>(null);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user?.name, name]);

  const trimmedName = name.trim();
  const trimmedEmail = newEmail.trim().toLowerCase();

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
    <Screen contentContainerStyle={{ paddingTop: 8 }}>
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
