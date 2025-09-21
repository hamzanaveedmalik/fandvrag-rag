
import { createClient } from '@supabase/supabase-js';

export function getSupabase(serviceKey?: string) {
  const url = process.env.SUPABASE_URL!;
  const key = serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false }});
}
