import { deviceStorage } from '@/lib/device-storage';
import { createDiscoveryProfileStore } from './discovery-profile-store';

export const DiscoveryProfileService =
  createDiscoveryProfileStore(deviceStorage);
