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

/**
 * LIVE logo resolver.
 * Cascade per token (tried in order, first that loads wins):
 *   1. In-house branded coin SVGs for Au/Ag (same-origin, always available)
 *   2. Trust Wallet assets (canonical, community-maintained, by checksummed address)
 *   3. SmolD live aggregator (auto-updates as lists change)
 *   4. CoinGecko canonical asset image
 *   5. Letter-mark fallback rendered locally
 *
 * Everything is address-driven so newly listed logos propagate without code
 * changes — swap the address list below if tokens migrate.
 */

const TOKEN_ADDRESSES: Record<string, { base?: string; eth?: string }> = {
  au:   {}, // native AV token — branded SVG is the canonical mark
  ag:   {},
  eth:  {},
  weth: { base: '0x4200000000000000000000000000000000000006' },
  usdc: { base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  aero: { base: '0x940181a94A35A4569E4529A3CDfB74E38FD98631' },
}

// Checksummed where the source requires it
const CHECKSUM: Record<string, string> = {
  weth: '0x4200000000000000000000000000000000000006',
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  aero: '0x940181a94A35A4569E4529A3CDfB74E38FD98631',
}

const LOCAL_BRANDS: Record<string, string> = {
  au: '/treasury/tokens/au.svg',
  ag: '/treasury/tokens/ag.svg',
}

function sourcesFor(tokenKey: string): string[] {
  const out: string[] = []
  const local = LOCAL_BRANDS[tokenKey]
  if (local) out.push(local)
  const addr = CHECKSUM[tokenKey]
  if (addr) {
    out.push(`https://assets.smold.app/api/token/base/${addr}/logo-128.png`)
    out.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${addr}/logo.png`)
  }
  // native ETH canonical
  if (tokenKey === 'eth') {
    out.push('https://assets.coingecko.com/coins/images/279/large/ethereum.png')
  }
  return out
}

export function TokenIcon({ tokenKey, size = 24, className, fallback }: TokenIconProps) {
  const sources = sourcesFor(tokenKey)
  const [idx, setIdx] = useState(0)
  const [broken, setBroken] = useState(false)

  useEffect(() => { setIdx(0); setBroken(false) }, [tokenKey])

  const showLetter = broken || idx >= sources.length
  const letter = (fallback || tokenKey || '?').slice(0, 2).toUpperCase()

  if (showLetter) {
    return (
      <span
        aria-label={letter}
        className={cn('inline-flex items-center justify-center rounded-full font-bold select-none shrink-0', className)}
        style={{
          width: size, height: size,
          fontSize: Math.max(8, size * 0.42),
          background: tokenKey === 'au'
            ? 'radial-gradient(circle at 30% 25%, #FFF3B0, #FFD700 45%, #8a6d0b)'
            : tokenKey === 'ag'
              ? 'radial-gradient(circle at 30% 25%, #fff, #C0C0C0 45%, #54565e)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
          color: '#0b0b12',
          border: '1px solid rgba(255,255,255,0.25)',
          textShadow: '0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        {letter}
      </span>
    )
  }

  return (
    <Image
      src={sources[idx]}
      alt={fallback || tokenKey}
      width={size}
      height={size}
      className={cn('rounded-full object-cover bg-black/20', className)}
      onError={() => {
        if (idx + 1 < sources.length) setIdx(idx + 1)
        else setBroken(true)
      }}
      unoptimized
    />
  )
}

export default TokenIcon
