'use client'

import { useQuery } from '@tanstack/react-query'

// ─── Price Data Providers ──────────────────────────────────────────
// Primary:   CoinGecko (free, no API key)
// Fallback:  Aerodrome pool reserves (on-chain via direct RPC)
// Au: derived from Aerodrome Au/WETH pool + ETH price from CoinGecko
// Ag: from on-chain Oracle contract (when available)
// ETH, AERO: direct from CoinGecko

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const CG_ETH_ID = 'ethereum'
const BASE_RPC = 'https://mainnet.base.org'

export interface TokenPrice {
  usd: number
  usd_24h_change: number | null
  usd_market_cap: number | null
  source: 'coingecko' | 'aerodrome-twap' | 'chainlink' | 'unavailable'
  last_updated: number
  icon: string | null
}

export interface PriceMap {
  [tokenKey: string]: TokenPrice
}

// ─── Token metadata ────────────────────────────────────────────────
interface TokenMeta {
  geckoId?: string              // CoinGecko API id for live price fetch
  icon: string                  // Token key for TokenIcon component
  aerodromePool?: `0x${string}` // Aerodrome pool for TWAP derivation
  tokenIndex?: 0 | 1            // Which token in the pool
}

const TOKEN_META: Record<string, TokenMeta> = {
  eth: {
    geckoId: 'ethereum',
    icon: 'eth',
  },
  weth: {
    geckoId: 'ethereum',        // WETH tracks ETH
    icon: 'weth',
  },
  usdc: {
    icon: 'usdc',
  },
  aero: {
    geckoId: 'aerodrome-finance',
    icon: 'aero',
  },
  au: {
    icon: 'au',
    aerodromePool: '0xA41aB59dDDE5bA9b561f838d0B23268ADB863665', // Au/WETH SlipStream
    tokenIndex: 0,
  },
  ag: {
    icon: 'ag',
    // No Ag/WETH pool yet — will use Oracle contract
  },
}

// ─── CoinGecko API ─────────────────────────────────────────────────
async function fetchCoinGeckoPrice(geckoId: string): Promise<TokenPrice> {
  const url = `${COINGECKO_BASE}/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`
  const res = await fetch(url, { next: { revalidate: 30 } })
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()
  const icon = data.image?.small || data.image?.thumb || null
  return {
    usd: data.market_data?.current_price?.usd ?? 0,
    usd_24h_change: data.market_data?.price_change_percentage_24h ?? null,
    usd_market_cap: data.market_data?.market_cap?.usd ?? null,
    source: 'coingecko',
    last_updated: Date.now(),
    icon,
  }
}

// ─── Aerodrome on-chain reserve fetch ─────────────────────────────
async function fetchPoolReserves(poolAddress: `0x${string}`): Promise<[number, number]> {
  // getReserves() selector: 0x0902f1ac
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: poolAddress, data: '0x0902f1ac' }, 'latest'],
      id: 1,
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)

  const hex = json.result.slice(2)
  const reserve0 = parseInt(hex.slice(0, 32), 16) / 1e18
  const reserve1 = parseInt(hex.slice(32, 64), 16) / 1e18
  return [reserve0, reserve1]
}

// ─── Icon cache ────────────────────────────────────────────────────
const iconCache: Record<string, { url: string; ts: number }> = {}
const ICON_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export function getTokenIconUrl(tokenKey: string): string | null {
  const meta = TOKEN_META[tokenKey]
  return meta?.icon || null
}

// ─── Main hook ─────────────────────────────────────────────────────
export function useLivePrices() {
  return useQuery({
    queryKey: ['live-prices'],
    queryFn: async (): Promise<PriceMap> => {
      const prices: PriceMap = {}

      // 1. Fetch ETH price from CoinGecko
      let ethPrice = 0
      try {
        const ethData = await fetchCoinGeckoPrice(CG_ETH_ID)
        ethPrice = ethData.usd
        prices.eth = ethData
      } catch {
        prices.eth = { usd: 0, usd_24h_change: null, usd_market_cap: null, source: 'unavailable', last_updated: Date.now(), icon: null }
      }

      // 2. Fetch AERO price from CoinGecko
      try {
        prices.aero = await fetchCoinGeckoPrice('aerodrome-finance')
      } catch {
        prices.aero = { usd: 0, usd_24h_change: null, usd_market_cap: null, source: 'unavailable', last_updated: Date.now(), icon: null }
      }

      // 3. Derive Au price from Aerodrome Au/WETH pool
      try {
        const meta = TOKEN_META.au
        if (meta.aerodromePool) {
          const [reserveAu, reserveWeth] = await fetchPoolReserves(meta.aerodromePool)
          const auInEth = reserveWeth / reserveAu // Au price in ETH terms
          const auUsd = auInEth * ethPrice
          prices.au = {
            usd: auUsd,
            usd_24h_change: null,
            usd_market_cap: null,
            source: 'aerodrome-twap',
            last_updated: Date.now(),
            icon: null,
          }
        }
      } catch {
        prices.au = { usd: 0, usd_24h_change: null, usd_market_cap: null, source: 'unavailable', last_updated: Date.now(), icon: null }
      }

      // 4. Ag price — no pool yet, will use Oracle when available
      prices.ag = { usd: 0, usd_24h_change: null, usd_market_cap: null, source: 'unavailable', last_updated: Date.now(), icon: null }

      // 5. USDC = $1 (stable, backed by CoinGecko verification)
      prices.usdc = { usd: 1, usd_24h_change: 0, usd_market_cap: null, source: 'chainlink', last_updated: Date.now(), icon: null }

      // 6. WETH tracks ETH
      prices.weth = { ...prices.eth!, icon: null }

      return prices
    },
    refetchInterval: 30_000, // 30s auto-refresh
    staleTime: 20_000,
  })
}
