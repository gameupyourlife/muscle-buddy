import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { View, type ViewProps } from 'react-native';

type UserAvatarProps = ViewProps & {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  size?: number;
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name
      .split(' ')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (parts.length > 0) {
      return parts.map((p) => p[0]?.toUpperCase()).join('');
    }
  }
  return (email?.slice(0, 2) || 'MB').toUpperCase();
}

/** Themed avatar with consistent fallback initials. */
function UserAvatar({
  name,
  email,
  imageUrl,
  size = 40,
  className,
  ...rest
}: UserAvatarProps) {
  return (
    <View {...rest}>
      <Avatar
        alt={name || email || 'User'}
        style={{ width: size, height: size }}
        className={cn('border border-separator', className)}
      >
        <AvatarImage source={imageUrl ? { uri: imageUrl } : undefined} />
        <AvatarFallback>
          <Text className="text-[13px] font-semibold">{getInitials(name, email)}</Text>
        </AvatarFallback>
      </Avatar>
    </View>
  );
}

export { UserAvatar };
