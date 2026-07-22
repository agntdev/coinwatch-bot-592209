export interface PriceResult {
  id: string;
  ticker: string;
  name: string;
  priceUsd: number;
  change24h: number;
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const TICKER_MAP: Record<string, { id: string; ticker: string; name: string }> = {
  BTC: { id: "bitcoin", ticker: "BTC", name: "Bitcoin" },
  ETH: { id: "ethereum", ticker: "ETH", name: "Ethereum" },
  SOL: { id: "solana", ticker: "SOL", name: "Solana" },
  XRP: { id: "ripple", ticker: "XRP", name: "XRP" },
  ADA: { id: "cardano", ticker: "ADA", name: "Cardano" },
  DOGE: { id: "dogecoin", ticker: "DOGE", name: "Dogecoin" },
  DOT: { id: "polkadot", ticker: "DOT", name: "Polkadot" },
  AVAX: { id: "avalanche-2", ticker: "AVAX", name: "Avalanche" },
  LINK: { id: "chainlink", ticker: "LINK", name: "Chainlink" },
  MATIC: { id: "matic-network", ticker: "MATIC", name: "Polygon" },
  UNI: { id: "uniswap", ticker: "UNI", name: "Uniswap" },
  LTC: { id: "litecoin", ticker: "LTC", name: "Litecoin" },
  ATOM: { id: "cosmos", ticker: "ATOM", name: "Cosmos" },
  NEAR: { id: "near", ticker: "NEAR", name: "NEAR Protocol" },
  APT: { id: "aptos", ticker: "APT", name: "Aptos" },
};

export function lookupTicker(ticker: string): { id: string; ticker: string; name: string } | null {
  const upper = ticker.toUpperCase().trim();
  return TICKER_MAP[upper] ?? null;
}

export function isValidTicker(ticker: string): boolean {
  return lookupTicker(ticker) !== null;
}

export async function fetchPrice(coingeckoId: string): Promise<PriceResult | null> {
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const entry = data[coingeckoId];
    if (!entry || entry.usd === undefined) return null;
    const info = Object.values(TICKER_MAP).find((t) => t.id === coingeckoId);
    return {
      id: coingeckoId,
      ticker: info?.ticker ?? coingeckoId.toUpperCase(),
      name: info?.name ?? coingeckoId,
      priceUsd: entry.usd,
      change24h: entry.usd_24h_change ?? 0,
    };
  } catch {
    return null;
  }
}

export async function fetchPrices(coingeckoIds: string[]): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();
  if (coingeckoIds.length === 0) return results;
  const ids = [...new Set(coingeckoIds)];
  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${ids.map(encodeURIComponent).join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return results;
    const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    for (const id of ids) {
      const entry = data[id];
      if (entry && entry.usd !== undefined) {
        const info = Object.values(TICKER_MAP).find((t) => t.id === id);
        results.set(id, {
          id,
          ticker: info?.ticker ?? id.toUpperCase(),
          name: info?.name ?? id,
          priceUsd: entry.usd,
          change24h: entry.usd_24h_change ?? 0,
        });
      }
    }
  } catch {
    // Return partial results on failure
  }
  return results;
}

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export function seededTickers(): Array<{ text: string; data: string }> {
  return Object.values(TICKER_MAP).map((t) => ({
    text: `${t.ticker} — ${t.name}`,
    data: `watchlist:pick:${t.id}`,
  }));
}
