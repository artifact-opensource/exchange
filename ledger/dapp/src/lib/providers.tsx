'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { wagmiConfig } from '@/lib/wagmi'
import { useState, type ReactNode } from 'react'
import { WalletHandoff } from '@/components/wallet-handoff'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchInterval: 30_000,
      },
    },
  }))

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* must be inside QueryClientProvider: wagmi v2 hooks use react-query */}
        <WalletHandoff />
        <OnchainKitProvider
          chain={base}
          config={{
            wallet: {
              display: 'modal',
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
