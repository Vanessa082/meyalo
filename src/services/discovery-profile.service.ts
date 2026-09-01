import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_DISCOVERY_PROFILE,
  type LocalDiscoveryProfile,
} from '@/types/discovery-profile';

const STORAGE_KEY = 'meyalo.discoveryProfile.v1';

export const DiscoveryProfileService = {
  /**
   * Loads the local discovery profile from AsyncStorage.
   * Returns null if missing or schema version mismatch.
   */
  async loadProfile(): Promise<LocalDiscoveryProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const profile = JSON.parse(raw) as LocalDiscoveryProfile;

      // Schema version check for forward-compatible migrations
      if (profile?.schemaVersion !== 1) {
        return null;
      }

      return profile;
    } catch (error) {
      console.warn('[DiscoveryProfileService] Failed to load profile:', error);
      return null;
    }
  },

  /**
   * Saves or updates the local discovery profile.
   */
  async saveProfile(
    profile: Partial<LocalDiscoveryProfile>,
  ): Promise<LocalDiscoveryProfile> {
    try {
      const existing = (await this.loadProfile()) ?? DEFAULT_DISCOVERY_PROFILE;

      const updated: LocalDiscoveryProfile = {
        ...existing,
        ...profile,
        schemaVersion: 1,
        onboardingCompletedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.warn('[DiscoveryProfileService] Failed to save profile:', error);
      return DEFAULT_DISCOVERY_PROFILE;
    }
  },

  /**
   * Clears the profile (for resetting preferences or re-running onboarding).
   */
  async clearProfile(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('[DiscoveryProfileService] Failed to clear profile:', error);
    }
  },

  /**
   * Quick boolean check to determine if onboarding has been completed.
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    const profile = await this.loadProfile();
    return Boolean(profile?.onboardingCompletedAt);
  },
};
