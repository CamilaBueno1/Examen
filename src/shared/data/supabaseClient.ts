/**
 * Supabase client singleton used by all adapters.
 * The URL and anon key must be provided via Expo environment variables
 * (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY).
 */
import { createClient } from '@supabase/supabase-js';
import { supabaseAuthStorage } from '@/modules/authentication/data/adapters/sqlite/authDao';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      storage: supabaseAuthStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
