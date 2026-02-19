/**
 * GET /api/cards — Search/browse cards from MongoDB.
 *
 * Reads from the synced MongoDB `cards` collection so that results
 * include live TCGplayer prices (updated by cron/prices).
 *
 * Accepts a Lucene-ish `q` parameter with field:value pairs:
 *   name:Charizard*  supertype:Pokemon  types:Fire
 *   set.id:sv4  rarity:"Special illustration rare"  subtypes:"Stage 2"
 *
 * Falls back to the TCGdex SDK when MongoDB is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { searchCards as searchCardsTcgdex } from "@/lib/tcgdex";

/* Parse the Lucene-ish query string into field/value pairs */
function parseQuery(q: string): Record<string, string> {
  const filters: Record<string, string> = {};
  const regex = /([\w.]+):(?:"([^"]*)"|([\S]*))/g;
  let match;
  while ((match = regex.exec(q))) {
    const field = match[1];
    const value = (match[2] || match[3]).replace(/\*$/, "");
    filters[field] = value;
  }
  return filters;
}

/* Build a MongoDB filter from parsed query fields */
function buildMongoFilter(filters: Record<string, string>) {
  const mf: Record<string, any> = {};

  if (filters.name) {
    mf.name = { $regex: filters.name, $options: "i" };
  }
  if (filters.supertype) {
    mf.supertype = { $regex: `^${filters.supertype}$`, $options: "i" };
  }
  if (filters.types) {
    mf.types = filters.types;
  }
  if (filters["set.id"]) {
    mf["set.id"] = filters["set.id"];
  }
  if (filters.rarity) {
    mf.rarity = { $regex: `^${filters.rarity}$`, $options: "i" };
  }
  if (filters.subtypes) {
    mf.subtypes = { $regex: filters.subtypes, $options: "i" };
  }
  if (filters.hp) {
    const hpVal = parseInt(filters.hp);
    if (!isNaN(hpVal)) {
      mf.hp = String(hpVal);
    }
  }

  // Price range filter — check across all known TCGplayer price variants
  const priceMin = filters.priceMin ? parseFloat(filters.priceMin) : null;
  const priceMax = filters.priceMax ? parseFloat(filters.priceMax) : null;
  if (priceMin !== null || priceMax !== null) {
    const variants = [
      "tcgplayer.prices.holofoil.market",
      "tcgplayer.prices.normal.market",
      "tcgplayer.prices.reverseHolofoil.market",
      "tcgplayer.prices.1stEditionHolofoil.market",
      "tcgplayer.prices.1stEditionNormal.market",
      "tcgplayer.prices.unlimitedHolofoil.market",
    ];
    const rangeCondition: Record<string, number> = {};
    if (priceMin !== null && !isNaN(priceMin)) rangeCondition.$gte = priceMin;
    if (priceMax !== null && !isNaN(priceMax)) rangeCondition.$lte = priceMax;

    mf.$or = variants.map((field) => ({ [field]: rangeCondition }));
  }

  return mf;
}

/* Map orderBy string to a MongoDB sort doc */
function buildMongoSort(orderBy: string): Record<string, 1 | -1> {
  if (!orderBy) return { "set.releaseDate": -1, number: -1 };
  const desc = orderBy.startsWith("-");
  const field = orderBy.replace(/^-/, "");

  const fieldMap: Record<string, string> = {
    "set.releaseDate": "set.releaseDate",
    name: "name",
    hp: "hp",
    number: "number",
    "tcgplayer.prices.holofoil.market": "tcgplayer.prices.holofoil.market",
  };
  const sortField = fieldMap[field] || field;
  return { [sortField]: desc ? -1 : 1 };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const page = parseInt(sp.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(sp.get("pageSize") || "20", 10), 250);
  const orderBy = sp.get("orderBy") || "";

  if (!q) {
    return NextResponse.json(
      { error: "Missing `q` query parameter" },
      { status: 400 },
    );
  }

  // Try MongoDB first (has live TCGplayer prices)
  const col = await getCollection("cards");
  if (col) {
    try {
      const filters = parseQuery(q);
      const mongoFilter = buildMongoFilter(filters);
      const sort = buildMongoSort(orderBy);
      const skip = (page - 1) * pageSize;

      const [docs, totalCount] = await Promise.all([
        col.find(mongoFilter).sort(sort).skip(skip).limit(pageSize).toArray(),
        col.countDocuments(mongoFilter),
      ]);

      // Only use MongoDB results if the collection actually has data
      if (totalCount > 0 || docs.length > 0) {
        return NextResponse.json({
          data: docs,
          page,
          pageSize,
          count: docs.length,
          totalCount,
        });
      }
      // Otherwise fall through to TCGdex (cards collection not yet synced)
    } catch (err: any) {
      console.error("MongoDB card search failed, falling back to TCGdex:", err.message);
    }
  }

  // Fallback: TCGdex SDK (no live prices)
  try {
    const data = await searchCardsTcgdex(q, page, pageSize, orderBy);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
