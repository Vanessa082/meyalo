import { supabase } from '@/lib/supabase';
import { createFriendPlans } from './friend-plans';

export const friendPlans = createFriendPlans(supabase);
