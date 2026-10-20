import { deviceStorage } from '@/lib/device-storage';
import { createSavedEventsStore } from './saved-events-store';

export const SavedEventsService = createSavedEventsStore(deviceStorage);
