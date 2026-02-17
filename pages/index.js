import { useState } from 'react';

export default function Home() {
  const [q, setQ] = useState('Charizard');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search(e) {
    e && e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCards(json.data || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, Arial, sans-serif' }}>
      <h1>CardBase — Pokémon TCG demo</h1>
      <form onSubmit={search} style={{ marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search card name (e.g. Charizard)"
          style={{ padding: 8, width: 320 }}
        />
        <button style={{ marginLeft: 8 }} disabled={!q || loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {cards.map((card) => (
          <div key={card.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <img src={card.images.small} alt={card.name} style={{ width: '100%', objectFit: 'contain' }} />
            <h3 style={{ margin: '8px 0' }}>{card.name}</h3>
            <div style={{ color: '#666', fontSize: 13 }}>{card.set?.name}</div>
            <PriceBlock card={card} />
          </div>
        ))}
      </div>

      <footer style={{ marginTop: 24, color: '#666', fontSize: 13 }}>
        Uses the Pokémon TCG API (server-side). Price data comes from the card's
        `tcgplayer` object when available.
      </footer>
    </div>
  );
}

function PriceBlock({ card }) {
  const tcg = card.tcgplayer;
  if (!tcg) {
    const searchUrl = `https://www.tcgplayer.com/search/q?query=${encodeURIComponent(card.name + ' ' + (card.set?.name || ''))}`;
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 6 }}>No price data available from Pokémon TCG API.</div>
        <a href={searchUrl} target="_blank" rel="noreferrer">Search TCGplayer</a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ marginBottom: 6 }}>
        <a href={tcg.url} target="_blank" rel="noreferrer">Open listing on TCGplayer</a>
      </div>

      {tcg.prices ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: '6px 0' }}>Condition</th>
              <th style={{ padding: '6px 0' }}>Low</th>
              <th style={{ padding: '6px 0' }}>Mid</th>
              <th style={{ padding: '6px 0' }}>High</th>
              <th style={{ padding: '6px 0' }}>Market</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(tcg.prices).map(([cond, vals]) => (
              <tr key={cond}>
                <td style={{ padding: '6px 0', textTransform: 'capitalize' }}>{cond}</td>
                <td style={{ padding: '6px 0' }}>{vals?.low ?? '-'}</td>
                <td style={{ padding: '6px 0' }}>{vals?.mid ?? '-'}</td>
                <td style={{ padding: '6px 0' }}>{vals?.high ?? '-'}</td>
                <td style={{ padding: '6px 0' }}>{vals?.market ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>No price breakdown available</div>
      )}
    </div>
  );
}
