'use client'

import { useEffect } from 'react'
import { useConnect, useAccount } from 'wagmi'

/**
 * WalletHandoff — the exchange (parent page) connects a wallet first, then
 * posts it into this app when embedded same-origin:
 *
 *   iframeRef.contentWindow.postMessage({ type: 'av_wallet', address }, '*')
 *
 * We silently connect the injected connector (no popup — origin permission
 * was already granted on the parent). Also honours #account=0x… on load.
 */
export function WalletHandoff() {
  const { connect, connectors } = useConnect()
  const { isConnected } = useAccount()

  useEffect(() => {
    const apply = (address: string) => {
      if (!address || isConnected) return
      const inj =
        connectors.find((c) => c.id === 'injected' && c.ready) ||
        connectors.find((c) => c.type === 'injected')
      if (!inj) return
      connect({ connector: inj }, { onError: () => {} })
    }

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return // same-origin handoff only
      const d = e.data as { type?: string; address?: string }
      if (d?.type === 'av_wallet' && d.address) {
        try { localStorage.setItem('av_handoff_account', d.address) } catch {}
        apply(d.address)
      }
    }

    window.addEventListener('message', onMessage)

    // deep-link: /treasury/#account=0x…
    const frag = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const acct = frag.get('account')
    if (acct) apply(acct)
    else {
      try {
        const stored = localStorage.getItem('av_handoff_account')
        if (stored && !isConnected) apply(stored)
      } catch {}
    }

    return () => window.removeEventListener('message', onMessage)
  }, [connect, connectors, isConnected])

  return null
}

export default WalletHandoff
