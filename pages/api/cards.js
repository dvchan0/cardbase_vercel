// Server-side proxy to Pokémon TCG API
// Reads POKEMON_TCG_API_KEY from process.env (keep it secret — use .env.local)

export default async function handler(req, res) {
  const { query } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing `query` string parameter' });
  }

  // Build a simple name search (do NOT include surrounding quotes — the upstream API treats quoted name queries as invalid).
  const q = `name:${String(query).replace(/"/g, '')}`;
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=12`;

  try {
    const headers = {};
    if (process.env.POKEMON_TCG_API_KEY) headers['X-Api-Key'] = process.env.POKEMON_TCG_API_KEY;

    // set a short timeout for the upstream call so the function fails fast in prod
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let r;
    try {
      r = await fetch(url, { headers, signal: controller.signal });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: 'Upstream request timed out' });
      }
      return res.status(502).json({ error: 'Upstream request failed', detail: fetchErr.message });
    } finally {
      clearTimeout(timeout);
    }

    if (!r.ok) {
      const body = await r.text();
      // include upstream status + truncated body for easier debugging (no secrets)
      return res.status(r.status).json({ error: `Upstream ${r.status} ${r.statusText}`, upstream: body?.slice?.(0, 1000) });
    }

    const payload = await r.json();
    // Return the API response directly — frontend can read `card.tcgplayer` if present
    return res.status(200).json(payload);
  } catch (err) {
    console.error('API /api/cards error:', err?.stack || err?.message || err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
