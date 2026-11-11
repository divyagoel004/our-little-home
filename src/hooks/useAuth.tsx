import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isConfigured } from '../lib/config';
import type { Profile } from '../types';

type Status = 'loading' | 'signedOut' | 'denied' | 'ready';

interface AuthValue {
  status: Status;
  session: Session | null;
  me: Profile | null;
  setMe: (p: Profile) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [status, setStatus] = useState<Status>(isConfigured ? 'loading' : 'signedOut');

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (!data.session) setStatus('signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next); // never await supabase calls in here
      if (!next) { setMe(null); setStatus('signedOut'); }
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // The profile row proves this person is one of the two allowed accounts.
  useEffect(() => {
    if (!session) return;
    let alive = true;
    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (!alive) return;
        if (data) { setMe(data as Profile); setStatus('ready'); return; }
        await new Promise((r) => setTimeout(r, 600));
      }
      if (alive) setStatus('denied');
    })();
    return () => { alive = false; };
  }, [session]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const value = useMemo(() => ({ status, session, me, setMe, signOut }), [status, session, me, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
