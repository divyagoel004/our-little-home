export type MoodKey =
  | 'happy' | 'missing_you' | 'sad' | 'anxious' | 'excited'
  | 'tired' | 'loved' | 'romantic' | 'peaceful' | 'random';

export type Visibility = 'private' | 'partner' | 'both';

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  author_id: string;
  title: string;
  content: string;
  day_feeling: string;
  thinking_about: string;
  wish_to_tell: string;
  grateful_for: string;
  mood: MoodKey;
  visibility: Visibility;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type DiaryDraft = Pick<
  DiaryEntry,
  'title' | 'content' | 'day_feeling' | 'thinking_about' | 'wish_to_tell' | 'grateful_for' | 'mood' | 'visibility' | 'photo_url'
>;

export interface FeelingMeter {
  id: string;
  user_id: string;
  miss_you_value: number;
  love_you_value: number;
  miss_updated_at: string | null;
  love_updated_at: string | null;
  current_mood: MoodKey | null;
  daily_thought: string;
  thought_updated_at: string | null;
  updated_at: string;
}

export interface FutureNote {
  id: string;
  author_id: string;
  title: string;
  content: string | null;
  opening_date: string; // yyyy-mm-dd
  visibility: 'private' | 'shared';
  created_at: string;
  is_locked: boolean;
}

export interface Memory {
  id: string;
  author_id: string;
  title: string;
  description: string;
  image_url: string | null;
  memory_date: string;
  created_at: string;
}

export type SurpriseCategory = 'love_note' | 'reason' | 'question' | 'affirmation';

export interface Surprise {
  id: string;
  author_id: string;
  content: string;
  category: SurpriseCategory;
  created_at: string;
}

export interface BoardMessage {
  id: string;
  author_id: string;
  content: string;
  color: 'blush' | 'sage' | 'champagne';
  created_at: string;
}

export interface Presence {
  user_id: string;
  last_seen_at: string;
  share_last_seen: boolean;
}

export interface HomeSettings {
  id: number;
  anniversary_date: string | null;
}
