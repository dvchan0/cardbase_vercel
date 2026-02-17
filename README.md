# CardBase — Pokémon TCG demo

A minimal Next.js demo that searches the Pokémon TCG API and shows TCGplayer price data (via the Pokémon TCG API `tcgplayer` object).

## Features
- Server-side API route (`/api/cards`) that proxies requests to the Pokémon TCG API
- Frontend search UI (`/`) that displays card images, set, and price breakdowns
- Uses `card.tcgplayer` data supplied by the Pokémon TCG API when available

## Setup
1. Copy `.env.local.example` to `.env.local` and add your API key:

   ```bash
   cp .env.local.example .env.local
   # then edit .env.local and paste your key
   ```

   Get an API key at: https://dev.pokemontcg.io/

2. Install and run locally:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000 and search for a card (e.g. `Charizard`).

## How price data works
- The Pokémon TCG API optionally includes a `tcgplayer` object on each card returned.
- `card.tcgplayer.prices` contains pricing breakdowns (low, mid, high, market) for available conditions.
- If `tcgplayer` is missing, the app falls back to a TCGplayer search link.

## Want deeper price data from TCGplayer?
- Use the official TCGplayer API (requires OAuth/server-side key). I can add that later if you want full marketplace endpoints.

## Deploy to Vercel
- This is a standard Next.js app — just push to a repo and connect to Vercel.
- Add `POKEMON_TCG_API_KEY` in Vercel Environment Variables.

---
If you'd like, I can:
- Add pagination, filters (set, rarity), and caching ✅
- Integrate the official TCGplayer API for extra price fields ✅
- Build a production-ready UI for Vercel deployment ✅

Tell me which feature to add next.