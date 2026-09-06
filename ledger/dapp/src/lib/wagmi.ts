'use client'

import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'AV Treasury',
      preference: 'smartWalletOnly',
    }),
    injected(),
    walletConnect({
      projectId: (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) ? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID : '778966c138f2d8d1d6d5a26c883070f3',
    }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
