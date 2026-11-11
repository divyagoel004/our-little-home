export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** True when the two public env vars are present. */
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Where Supabase should send the magic-link click (must be in the Supabase redirect allow-list). */
export const redirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;
