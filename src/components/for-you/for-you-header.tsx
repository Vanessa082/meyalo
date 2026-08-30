/**
 * ForYouHeader
 *
 * Auth-aware header:
 * - Unauthenticated → neutral UserCircle2 guest icon; tapping navigates to login
 * - Authenticated   → real avatar with online badge
 */
import { Image } from 'expo-image';
import { Bell, UserCircle2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { BrandLogo } from '@/components/ui/brand-logo';
import { useTheme } from '@/hooks/use-theme';

interface ForYouHeaderProps {
  isAuthenticated?: boolean;
  hasUnreadNotifications?: boolean;
  avatarUrl?: string | null;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
}

export function ForYouHeader({
  isAuthenticated = false,
  hasUnreadNotifications = false,
  avatarUrl = null,
  onPressNotifications,
  onPressProfile,
}: ForYouHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.headerBar}>
      {/* Brand logo — always teal M mark, text colour adapts to theme */}
      <BrandLogo size="md" variant="horizontal" />

      {/* Right actions */}
      <View style={styles.rightActions}>
        <Pressable
          style={styles.bellButton}
          onPress={onPressNotifications}
          hitSlop={8}
        >
          <Bell size={22} color={colors.text} strokeWidth={1.8} />
          {hasUnreadNotifications && <View style={styles.notificationDot} />}
        </Pressable>

        {isAuthenticated && avatarUrl ? (
          <Pressable onPress={onPressProfile} style={styles.avatarWrapper}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
            <View style={styles.onlineBadge} />
          </Pressable>
        ) : (
          <Pressable onPress={onPressProfile} hitSlop={8}>
            <UserCircle2 size={34} color={colors.textMuted} strokeWidth={1.4} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
