import { deviceStorage } from '@/lib/device-storage';
import { createHiddenEventsStore } from './hidden-events-store';

export const HiddenEventsService = createHiddenEventsStore(deviceStorage);
