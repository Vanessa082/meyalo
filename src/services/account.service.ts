import { supabase } from '@/lib/supabase';
import { createAccountService } from './account';

export const account = createAccountService(supabase);
