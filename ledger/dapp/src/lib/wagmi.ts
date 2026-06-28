'use client'

import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'AV Treasury',
      preference: 'smartWalletOnly',
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
