/**
 * Client GIF — API officielle Tenor (v2). Même clé publique déjà utilisée par
 * l'ancien picker (`components/chat/gif-picker.tsx`), rate-limitée pour un
 * usage frontend ; surchargeable via NEXT_PUBLIC_TENOR_API_KEY si besoin.
 */

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const PAGE_SIZE = 24;

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

interface TenorFetchResult {
  gifs: GifResult[];
  next: string;
}

function mapResults(data: { results?: any[]; next?: string }): TenorFetchResult {
  const gifs: GifResult[] = (data.results || []).map((item: any) => ({
    id: item.id,
    url: item.media_formats?.gif?.url || item.media_formats?.mediumgif?.url || '',
    previewUrl: item.media_formats?.tinygif?.url || item.media_formats?.nanogif?.url || '',
    width: item.media_formats?.tinygif?.dims?.[0] || 200,
    height: item.media_formats?.tinygif?.dims?.[1] || 200,
    title: item.title || '',
  }));
  return { gifs, next: data.next || '' };
}

export async function searchGifs(query: string, next?: string): Promise<TenorFetchResult> {
  try {
    let endpoint = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=alfychat&limit=${PAGE_SIZE}&media_filter=gif,tinygif`;
    if (next) endpoint += `&pos=${next}`;
    const res = await fetch(endpoint);
    if (!res.ok) return { gifs: [], next: '' };
    return mapResults(await res.json());
  } catch {
    return { gifs: [], next: '' };
  }
}

export async function trendingGifs(next?: string): Promise<TenorFetchResult> {
  try {
    let endpoint = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=alfychat&limit=${PAGE_SIZE}&media_filter=gif,tinygif`;
    if (next) endpoint += `&pos=${next}`;
    const res = await fetch(endpoint);
    if (!res.ok) return { gifs: [], next: '' };
    return mapResults(await res.json());
  } catch {
    return { gifs: [], next: '' };
  }
}
