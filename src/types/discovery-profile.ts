export type EventFormatPreference = 'in_person' | 'virtual' | 'hybrid';

export interface LocalDiscoveryProfile {
  schemaVersion: 1;
  onboardingCompletedAt?: string;
  location: {
    cityId: string;
    cityName: string;
    mode: 'manual' | 'device';
  };
  formats: EventFormatPreference[];
  interestIds: string[];
  goalIds: string[];
  locale: 'en' | 'fr';
}

export const DEFAULT_DISCOVERY_PROFILE: LocalDiscoveryProfile = {
  schemaVersion: 1,
  location: {
    cityId: 'yaounde',
    cityName: 'Yaoundé',
    mode: 'manual',
  },
  formats: ['in_person', 'virtual', 'hybrid'],
  interestIds: ['technology', 'business'],
  goalIds: ['grow_business', 'learn_skills'],
  locale: 'en',
};
