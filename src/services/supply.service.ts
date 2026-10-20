import { supabase } from '@/lib/supabase';
import { createSupplyService } from './supply';

export const supply = createSupplyService(supabase);
