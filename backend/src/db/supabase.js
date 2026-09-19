import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

let supabase = null;

export function getSupabase() {
  if (!supabase) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase URL and service role key are required. Check your .env file.');
    }
    supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }
  return supabase;
}

export default getSupabase;
