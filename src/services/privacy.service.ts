import { deviceStorage } from '@/lib/device-storage';
import { createAgeGroupSetting } from './age-group-setting';
import { createReminderSetting } from './reminder-setting';

export const AgeGroupSetting = createAgeGroupSetting(deviceStorage);
export const ReminderSetting = createReminderSetting(deviceStorage);
