import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { useLive } from './useLive';
import { useAmbientSound } from './useAmbientSound';
import {
  fetchMeters, fetchPresence, fetchProfiles, fetchSettings, heartbeat, updateProfile,
} from '../services/home';
import type { FeelingMeter, HomeSettings, Presence, Profile } from '../types';

interface Toast { id: number; text: string; kind: 'ok' | 'error' }
interface Burst { id: number; x: number }

interface HomeValue {
  me: Profile;
  partner: Profile | null;
  profiles: Profile[];
  nameOf: (id: string) => string;
  myMeter: FeelingMeter | null;
  partnerMeter: FeelingMeter | null;
  presenceOf: (id: string) => Presence | null;
  myPresence: Presence | null;
  settings: HomeSettings | null;
  reloadAll: () => void;
  toast: (text: string, kind?: 'ok' | 'error') => void;
  toasts: Toast[];
  bursts: Burst[];
  burstHearts: () => void;
  sound: ReturnType<typeof useAmbientSound>;
}

const Ctx = createContext<HomeValue | null>(null);

export function HomeProvider({ children }: { children: ReactNode }) {
  const { me: authMe, setMe } = useAuth();
  const me = authMe as Profile;

  const profiles = useLive<Profile[]>('profiles', fetchProfiles, ['profiles'], [me]);
  const meters = useLive<FeelingMeter[]>('meters', fetchMeters, ['feeling_meters'], []);
  const presence = useLive<Presence[]>('presence', fetchPresence, ['presence'], []);
  const settings = useLive<HomeSettings | null>('settings', fetchSettings, ['home_settings'], null);
  const sound = useAmbientSound();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);

  const burstHearts = useCallback(() => {
    const id = ++seq.current;
    setBursts((b) => [...b, { id, x: 30 + Math.random() * 40 }]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2600);
  }, []);

  // keep my own profile in sync with realtime changes
  useEffect(() => {
    const mine = profiles.data.find((p) => p.id === me.id);
    if (mine && (mine.display_name !== me.display_name || mine.timezone !== me.timezone || mine.avatar_url !== me.avatar_url)) setMe(mine);
  }, [profiles.data, me, setMe]);

  // remember my timezone so my partner's clock for me is right
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== me.timezone) void updateProfile(me.id, { timezone: tz }).catch(() => undefined);
  }, [me.id, me.timezone]);

  // gentle "last seen" heartbeat
  useEffect(() => {
    const beat = () => document.visibilityState === 'visible' && void heartbeat(me.id).catch(() => undefined);
    beat();
    const id = window.setInterval(beat, 60_000);
    document.addEventListener('visibilitychange', beat);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', beat); };
  }, [me.id]);

  const partner = profiles.data.find((p) => p.id !== me.id) ?? null;
  const value = useMemo<HomeValue>(
    () => ({
      me,
      partner,
      profiles: profiles.data,
      nameOf: (id) => (id === me.id ? me.display_name : profiles.data.find((p) => p.id === id)?.display_name ?? 'Someone'),
      myMeter: meters.data.find((m) => m.user_id === me.id) ?? null,
      partnerMeter: partner ? meters.data.find((m) => m.user_id === partner.id) ?? null : null,
      presenceOf: (id) => presence.data.find((p) => p.user_id === id) ?? null,
      myPresence: presence.data.find((p) => p.user_id === me.id) ?? null,
      settings: settings.data,
      reloadAll: () => { void profiles.reload(); void meters.reload(); void presence.reload(); void settings.reload(); },
      toast, toasts, bursts, burstHearts, sound,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, partner, profiles.data, meters.data, presence.data, settings.data, toasts, bursts, sound.on, sound.kind, toast, burstHearts],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHome() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHome must be used inside <HomeProvider>');
  return v;
}
