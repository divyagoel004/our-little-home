import { supabase } from '../lib/supabase';
import type {
  BoardMessage, DiaryDraft, DiaryEntry, FeelingMeter, FutureNote, HomeSettings, Memory,
  MoodKey, Presence, Profile, Surprise, SurpriseCategory,
} from '../types';

const ok = <T>(r: { data: T | null; error: unknown }): T => {
  if (r.error) throw r.error;
  return (r.data ?? ([] as unknown)) as T;
};

// ---- profiles / presence / settings --------------------------------------
export const fetchProfiles = async () =>
  ok<Profile[]>(await supabase.from('profiles').select('*'));

export const updateProfile = async (id: string, patch: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'timezone'>>) =>
  ok(await supabase.from('profiles').update(patch).eq('id', id));

export const fetchPresence = async () =>
  ok<Presence[]>(await supabase.from('presence').select('*'));

export const heartbeat = async (userId: string) =>
  ok(await supabase.from('presence').upsert({ user_id: userId, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id', ignoreDuplicates: false }));

export const setShareLastSeen = async (userId: string, share: boolean) =>
  ok(await supabase.from('presence').upsert({ user_id: userId, share_last_seen: share, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' }));

export const fetchSettings = async (): Promise<HomeSettings | null> => {
  const { data, error } = await supabase.from('home_settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return (data as HomeSettings | null) ?? null;
};

export const saveAnniversary = async (userId: string, date: string | null) =>
  ok(await supabase.from('home_settings').update({ anniversary_date: date, updated_by: userId }).eq('id', 1));

// ---- diary ------------------------------------------------------------------
export const fetchDiary = async () =>
  ok<DiaryEntry[]>(await supabase.from('diary_entries').select('*').order('created_at', { ascending: false }).limit(1000));

export const createDiary = async (authorId: string, d: DiaryDraft) =>
  ok<DiaryEntry>(await supabase.from('diary_entries').insert({ ...d, author_id: authorId }).select().single());

export const updateDiary = async (id: string, d: DiaryDraft) =>
  ok<DiaryEntry>(await supabase.from('diary_entries').update(d).eq('id', id).select().single());

export const deleteDiary = async (id: string) =>
  ok(await supabase.from('diary_entries').delete().eq('id', id));

// ---- feeling meters -------------------------------------------------------------
export const fetchMeters = async () =>
  ok<FeelingMeter[]>(await supabase.from('feeling_meters').select('*'));

export const saveMeter = async (kind: 'miss' | 'love', value: number) =>
  ok<FeelingMeter>(await supabase.rpc('save_meter', { p_kind: kind, p_value: Math.round(value) }));

export const saveMoodAndThought = async (userId: string, mood: MoodKey | null, thought: string) =>
  ok(
    await supabase
      .from('feeling_meters')
      .update({ current_mood: mood, daily_thought: thought, thought_updated_at: new Date().toISOString() })
      .eq('user_id', userId),
  );

// ---- future notes (RPC only) ----------------------------------------------------
export const fetchFutureNotes = async () => ok<FutureNote[]>(await supabase.rpc('get_future_notes'));

export const createFutureNote = async (n: { title: string; content: string; opening_date: string; visibility: 'private' | 'shared' }) =>
  ok(await supabase.rpc('create_future_note', { p_title: n.title, p_content: n.content, p_opening_date: n.opening_date, p_visibility: n.visibility }));

export const updateFutureNote = async (id: string, n: { title: string; content: string; opening_date: string; visibility: 'private' | 'shared' }) =>
  ok(await supabase.rpc('update_future_note', { p_id: id, p_title: n.title, p_content: n.content, p_opening_date: n.opening_date, p_visibility: n.visibility }));

export const deleteFutureNote = async (id: string) => ok(await supabase.rpc('delete_future_note', { p_id: id }));

// ---- memories -------------------------------------------------------------------
export const fetchMemories = async () =>
  ok<Memory[]>(await supabase.from('memories').select('*').order('memory_date', { ascending: false }).order('created_at', { ascending: false }));

export const createMemory = async (authorId: string, m: Pick<Memory, 'title' | 'description' | 'image_url' | 'memory_date'>) =>
  ok(await supabase.from('memories').insert({ ...m, author_id: authorId }));

export const updateMemory = async (id: string, m: Pick<Memory, 'title' | 'description' | 'image_url' | 'memory_date'>) =>
  ok(await supabase.from('memories').update(m).eq('id', id));

export const deleteMemory = async (id: string) => ok(await supabase.from('memories').delete().eq('id', id));

// ---- surprises ------------------------------------------------------------------
export const fetchSurprises = async () =>
  ok<Surprise[]>(await supabase.from('daily_surprises').select('*').order('created_at', { ascending: false }));

export const createSurprise = async (authorId: string, content: string, category: SurpriseCategory) =>
  ok(await supabase.from('daily_surprises').insert({ author_id: authorId, content, category }));

export const deleteSurprise = async (id: string) => ok(await supabase.from('daily_surprises').delete().eq('id', id));

// ---- board ----------------------------------------------------------------------
export const fetchBoard = async () =>
  ok<BoardMessage[]>(await supabase.from('board_messages').select('*').order('created_at', { ascending: false }).limit(60));

export const postBoard = async (authorId: string, content: string, color: BoardMessage['color']) =>
  ok(await supabase.from('board_messages').insert({ author_id: authorId, content, color }));

export const deleteBoard = async (id: string) => ok(await supabase.from('board_messages').delete().eq('id', id));
