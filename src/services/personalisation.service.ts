import { deviceStorage } from '@/lib/device-storage';
import { createLearningSetting } from './learning-setting';
import { createOpenedEventsStore } from './opened-events-store';

export const OpenedEventsService = createOpenedEventsStore(deviceStorage);
export const LearningSetting = createLearningSetting(deviceStorage);
