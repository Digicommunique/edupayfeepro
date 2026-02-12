
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuunwliqnwpocezwmksf.supabase.co';
const supabaseAnonKey = 'sb_publishable_MUbkBMiHQfKw3Y3hdN_qaQ_eg9JkQvM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
