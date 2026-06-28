'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface TokenIconProps {
  tokenKey: string
  size?: number
  className?: string
  fallback?: string // symbol to show on error, e.g. "Au"
}

// Icon sources with auto-refresh from CoinGecko / trusted CDNs
const ICON_SOURCES: Record<string, string> = {
  eth: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  weth: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
  usdc: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
  aero: 'https://assets.coingecko.com/coins/images/29871/large/AERO.png',
  // Au and Ag not yet on CoinGecko — use IPFS placeholder (update when listed)
  au: 'https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  ag: 'https://ipfs.io/ipfs/bafybeih5b4kcx2v4mndp3sc7p4x2oayp3uuxp3j4c45u6o5e44o6wxbuea',
  btc: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
}

// Auto-refresh map: tokenKey -> { url, expiresAt }
const refreshMap: Record<string, { url: string; expiresAt: number }> = {}
const REFRESH_TTL = 24 * 60 * 60 * 1000 // 24h

function getTokenIconSrc(tokenKey: string): string {
  return ICON_SOURCES[tokenKey] || ''
}

export function TokenIcon({ tokenKey, size = 24, className, fallback }: TokenIconProps) {
  const [src, setSrc] = useState<string>(() => getTokenIconSrc(tokenKey))
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Check if we need to refresh (URL might be stale)
    const cached = refreshMap[tokenKey]
    if (cached && Date.now() < cached.expiresAt) {
      setSrc(cached.url)
      return
    }

    // For tokens not yet on CoinGecko, we use a proxy or fallback immediately
    if (tokenKey === 'au' || tokenKey === 'ag') {
      // These tokens aren't on CoinGecko yet — use SVG placeholder
      // Once listed, update ICON_SOURCES above
      setSrc('')
      setHasError(true)
      return
    }

    // Refresh icon URL from CoinGecko (in case it changed)
    const geckoMap: Record<string, string> = {
      eth: '279',
      weth: '2518',
      usdc: '6319',
      aero: '29871',
      btc: '1',
    }

    const coinId = geckoMap[tokenKey]
    if (!coinId) {
      setHasError(true)
      return
    }

    // Use CoinGecko's image CDN with cache-busting
    const url = `https://assets.coingecko.com/coins/images/${coinId}/large/${tokenKey === 'btc' ? 'bitcoin' : tokenKey}.png`
    refreshMap[tokenKey] = { url, expiresAt: Date.now() + REFRESH_TTL }
    setSrc(url)
  }, [tokenKey])

  if (hasError || !src) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70',
          className
        )}
        style={{ width: size, height: size }}
      >
        {fallback || tokenKey.toUpperCase().slice(0, 2)}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={tokenKey.toUpperCase()}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      onError={() => setHasError(true)}
      unoptimized // CoinGecko CDN images don't need Next.js optimization
    />
  )
}
