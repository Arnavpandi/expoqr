import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with the service-role key.
 * MUST only be used in server code (API routes, server components, scripts).
 */
export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
