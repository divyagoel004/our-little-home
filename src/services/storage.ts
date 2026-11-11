import { supabase } from '../lib/supabase';

const BUCKET = 'home-photos';
export type PhotoKind = 'memories' | 'diary' | 'avatars';

/** Shrinks a photo in the browser (max 1600px, JPEG) so uploads are quick and small. */
export async function resizeImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('That image could not be read.'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return blob ?? file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Uploads to  <kind>/<userId>/<uuid>.jpg  and returns the storage path. */
export async function uploadPhoto(kind: PhotoKind, userId: string, file: File): Promise<string> {
  const blob = await resizeImage(file);
  const ext = blob.type === 'image/gif' ? 'gif' : 'jpg';
  const path = `${kind}/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]); // best effort
}

/** Private bucket → short-lived signed URLs. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 60 * 60);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}
