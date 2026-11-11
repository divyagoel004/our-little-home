import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Only the PUBLIC publishable/anon key lives in the browser. Everything is protected
 * server-side by Row Level Security (supabase/policies.sql). Never use the secret key here.
 * "implicit" flow so a magic link also works when opened in another browser/app (phones).
 */
export const supabase = createClient(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY || 'missing-anon-key',
  {
    auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);
