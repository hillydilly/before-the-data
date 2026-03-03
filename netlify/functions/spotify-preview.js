/**
 * Netlify Function: GET /api/spotify-preview?trackId={id}
 * Returns the 30-second preview URL for a Spotify track (no user auth needed)
 * Spotify Client Credentials flow — server-side only, key never exposed to client
 */

const SPOTIFY_CLIENT_ID = 'f7dac43e65584124ac11bc702431d26d';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '0a4ec9c84f114f81a80b0508e006299e';

let tokenCache = { token: null, expiresAt: 0 };

async function getSpotifyToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

export default async (req) => {
  const url = new URL(req.url);
  const trackId = url.searchParams.get('trackId')?.trim();
  if (!trackId) return Response.json({ error: 'trackId required' }, { status: 400 });

  try {
    const token = await getSpotifyToken();
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}?market=US`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return Response.json({ error: 'Track not found' }, { status: 404 });
    const track = await res.json();
    return Response.json({
      previewUrl: track.preview_url || null,
      trackId,
      name: track.name,
    }, {
      headers: {
        // Cache for 1 hour — preview URLs are stable
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (err) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
};

export const config = { path: '/api/spotify-preview' };
