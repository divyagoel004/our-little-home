import type { MoodKey } from '../types';

export interface MoodInfo {
  key: MoodKey;
  label: string;
  emoji: string;
  color: string;
  /** which gentle atmosphere to show */
  atmosphere: 'rain' | 'hearts' | 'petals' | 'sparkles' | 'glow' | 'none';
}

export const MOODS: MoodInfo[] = [
  { key: 'happy', label: 'Happy', emoji: '☀️', color: '#F3D9A4', atmosphere: 'sparkles' },
  { key: 'missing_you', label: 'Missing you', emoji: '🌙', color: '#DFAEAA', atmosphere: 'hearts' },
  { key: 'sad', label: 'Sad', emoji: '🌧️', color: '#C9D3DA', atmosphere: 'rain' },
  { key: 'anxious', label: 'Anxious', emoji: '🍃', color: '#D6DDC8', atmosphere: 'glow' },
  { key: 'excited', label: 'Excited', emoji: '✨', color: '#F5D6B0', atmosphere: 'sparkles' },
  { key: 'tired', label: 'Tired', emoji: '😴', color: '#E3D8CB', atmosphere: 'glow' },
  { key: 'loved', label: 'Loved', emoji: '💗', color: '#F5C9C6', atmosphere: 'hearts' },
  { key: 'romantic', label: 'Romantic', emoji: '🌹', color: '#E9B7B3', atmosphere: 'petals' },
  { key: 'peaceful', label: 'Peaceful', emoji: '🌿', color: '#B7C4AE', atmosphere: 'glow' },
  { key: 'random', label: 'Random thoughts', emoji: '💭', color: '#E8D6B8', atmosphere: 'none' },
];

export const MOOD_BY_KEY: Record<MoodKey, MoodInfo> = Object.fromEntries(
  MOODS.map((m) => [m.key, m]),
) as Record<MoodKey, MoodInfo>;

export const moodOf = (k: string | null | undefined): MoodInfo | null =>
  k && k in MOOD_BY_KEY ? MOOD_BY_KEY[k as MoodKey] : null;
