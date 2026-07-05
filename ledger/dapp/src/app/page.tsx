import { FlywheelMonitor } from "@/components/monitor/FlywheelMonitor"
'use client'

import { useAccount } from 'wagmi'
import { usePortfolio } from '@/hooks/use-portfolio'
import { useLivePrices, TokenPrice } from '@/hooks/use-live-prices'
import { formatTokenAmount, formatUsd } from '@/lib/utils'
import { ArrowRight, Droplets, Coins, Vote, TrendingUp, BarChart3, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { TokenIcon } from '@/components/token-icon'

export default function DashboardPage() {
  const { isConnected } = useAccount()
  const { auBalance, agBalance, votingPower, auSupply, agSupply, isLoading: portfolioLoading } = usePortfolio()
  const { data: livePrices, isLoading: pricesLoading, refetch: refetchPrices, dataUpdatedAt } = useLivePrices()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Coins className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AV Treasury</h1>
          <p className="text-muted-foreground max-w-md">
            The dual-token DAO on Base. Swap Au/Ag, manage Aerodrome liquidity, stake LP NFTs, and govern the protocol.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <LivePriceCard label="Au Price" price={livePrices?.au} />
          <LivePriceCard label="Ag Price" price={livePrices?.ag} />
          <LivePriceCard label="ETH" price={livePrices?.eth} />
          <LivePriceCard label="AERO" price={livePrices?.aero} />
        </div>
      </div>
    )
  }

  const isLoading = portfolioLoading || pricesLoading

  return (
    <div className="space-y-6">
      {/* Live Ticker Bar */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 overflow-x-auto">
        <button onClick={() => refetchPrices()} className="shrink-0 p-1 rounded hover:bg-accent transition-colors" title="Refresh prices">
          <RefreshCw className={`h-3 w-3 text-muted-foreground ${pricesLoading ? 'animate-spin' : ''}`} />
        </button>
        <TickerItem symbol="Au" price={livePrices?.au} />
        <TickerItem symbol="Ag" price={livePrices?.ag} />
        <TickerItem symbol="ETH" price={livePrices?.eth} />
        <TickerItem symbol="AERO" price={livePrices?.aero} />
        <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
          {new Date(dataUpdatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Au Balance"
          value={isLoading ? '...' : formatTokenAmount(auBalance)}
          sublabel={livePrices?.au ? `~$${(livePrices.au.usd * Number(auBalance) / 1e18).toFixed(2)}` : ''}
          icon={<TokenIcon tokenKey="au" size={16} fallback="Au" />}
        />
        <StatCard
          label="Ag Balance"
          value={isLoading ? '...' : formatTokenAmount(agBalance)}
          sublabel={livePrices?.ag ? `~$${(livePrices.ag.usd * Number(agBalance) / 1e18).toFixed(2)}` : ''}
          icon={<TokenIcon tokenKey="ag" size={16} fallback="Ag" />}
        />
        <StatCard
          label="Voting Power"
          value={isLoading ? '...' : formatTokenAmount(votingPower)}
          sublabel="Delegated Ag"
          icon={<Vote className="h-4 w-4" />}
        />
        <StatCard
          label="Au Supply"
          value={isLoading ? '...' : formatTokenAmount(auSupply)}
          sublabel={livePrices?.au ? `MCap: ${formatUsd(livePrices.au.usd * Number(auSupply) / 1e18)}` : ''}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          title="Swap Tokens"
          description="Trade Au, Ag, USDC on Aerodrome"
          href="/swap"
          icon={<ArrowRight className="h-4 w-4" />}
        />
        <ActionCard
          title="Manage Liquidity"
          description="Add/remove LP, vote on gauges, claim AERO"
          href="/liquidity"
          icon={<Droplets className="h-4 w-4" />}
        />
        <ActionCard
          title="Stake & Govern"
          description="Stake LP NFTs, vote on proposals"
          href="/stake"
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      {/* Protocol Health */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Protocol Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Au Supply</div>
            <div className="font-medium">{isLoading ? '...' : formatTokenAmount(auSupply)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ag Supply</div>
            <div className="font-medium">{isLoading ? '...' : formatTokenAmount(agSupply)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Au Price Source</div>
            <div className="font-medium">{livePrices?.au?.source || 'Loading...'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Price Feed</div>
            <div className="font-medium flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${livePrices?.au?.usd ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {livePrices?.au?.usd ? 'Live (CoinGecko + Aerodrome)' : 'Connecting...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sublabel, icon }: { label: string; value: string; sublabel?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-xl font-semibold">{value}</div>
      {sublabel && <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>}
    </div>
  )
}

function ActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{title}</h3>
        <div className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}

function TickerItem({ symbol, price }: { symbol: string; price?: TokenPrice }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <TokenIcon tokenKey={symbol.toLowerCase()} size={16} fallback={symbol} />
      <span className="text-xs font-medium">{symbol}</span>
      <span className="text-xs text-muted-foreground">
        {price?.usd ? `$${price.usd < 0.01 ? price.usd.toExponential(2) : price.usd.toFixed(4)}` : '--'}
      </span>
      {price?.usd_24h_change !== null && price?.usd_24h_change !== undefined && (
        <span className={`text-[10px] ${price.usd_24h_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {price.usd_24h_change >= 0 ? '+' : ''}{price.usd_24h_change.toFixed(2)}%
        </span>
      )}
    </div>
  )
}

function LivePriceCard({ label, price }: { label: string; price?: TokenPrice }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-lg font-semibold mt-1 flex items-center justify-center gap-2">
        <TokenIcon tokenKey={label.split(' ')[0].toLowerCase()} size={18} fallback={label.split(' ')[0]} />
        {price?.usd ? `$${price.usd < 0.01 ? price.usd.toExponential(2) : price.usd.toFixed(4)}` : '--'}
      </div>
      {price?.usd_24h_change !== null && price?.usd_24h_change !== undefined && (
        <div className={`text-[10px] mt-0.5 ${price.usd_24h_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {price.usd_24h_change >= 0 ? '+' : ''}{price.usd_24h_change.toFixed(2)}% 24h
        </div>
      )}
    </div>
  )
}
