'use client'

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi'
import { base } from 'wagmi/chains'
import { ArrowDownUp, Settings, Loader2, ExternalLink } from 'lucide-react'
import { AERODROME_ROUTER_ABI, ERC20_ABI } from '@/lib/abis'
import { AERODROME, TOKENS, TOKEN_META, EXPLORER } from '@/lib/constants'
import { formatTokenAmount, cn } from '@/lib/utils'
import { useLivePrices } from '@/hooks/use-live-prices'
import { TokenIcon } from '@/components/token-icon'
import { useState, useCallback } from 'react'

export type TokenKey = 'au' | 'ag' | 'usdc' | 'weth'

const TOKEN_LIST: TokenKey[] = ['au', 'ag', 'usdc', 'weth']

function tokenAddr(key: TokenKey): `0x${string}` {
  return TOKENS[key] as `0x${string}`
}

function tokenDecimals(key: TokenKey): number {
  return key === 'usdc' ? 6 : 18
}

function parseInput(val: string, dec: number): bigint {
  if (!val || val === '.') return 0n
  const [intPart, fracPart = ''] = val.split('.')
  const padded = (fracPart + '0'.repeat(dec)).slice(0, dec)
  return BigInt(intPart + padded)
}

function formatOutput(val: bigint, dec: number): string {
  const str = val.toString().padStart(dec + 1, '0')
  const intPart = str.slice(0, -dec) || '0'
  const fracPart = str.slice(-dec).replace(/0+$/, '')
  return fracPart ? `${intPart}.${fracPart}` : intPart
}

export default function SwapPage() {
  const { address, isConnected } = useAccount()
  const [fromToken, setFromToken] = useState<TokenKey>('au')
  const [toToken, setToToken] = useState<TokenKey>('ag')
  const [amountIn, setAmountIn] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)

  const fromDecimals = tokenDecimals(fromToken)
  const toDecimals = tokenDecimals(toToken)
  const amountInBigInt = parseInput(amountIn, fromDecimals)

  // Determine swap path (direct or through WETH)
  const path = useSwapPath(fromToken, toToken)

  // Quote
  const { data: amountsOut, isLoading: isQuoting } = useReadContract({
    address: AERODROME.routerV2,
    abi: AERODROME_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountInBigInt, path],
    chainId: base.id,
    query: { enabled: amountInBigInt > 0n && path.length >= 2 },
  })

  const amountOut = (amountsOut as bigint[] | undefined)?.[path.length - 1] ?? 0n
  const slippageBps = BigInt(Math.round(slippage * 100))
  const amountOutMin = amountOut > 0n ? amountOut - (amountOut * slippageBps) / 10000n : 0n

  // Balances
  const { data: balances } = useReadContracts({
    contracts: [
      { address: tokenAddr(fromToken), abi: ERC20_ABI, functionName: 'balanceOf' as const, args: [address!] },
      { address: tokenAddr(toToken), abi: ERC20_ABI, functionName: 'balanceOf' as const, args: [address!] },
    ],
    query: { enabled: !!address },
  })

  // Allowance
  const { data: allowance } = useReadContract({
    address: tokenAddr(fromToken),
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, AERODROME.routerV2],
    query: { enabled: !!address && amountInBigInt > 0n },
  })

  // Approve
  const { data: approveHash, writeContract: approveWrite, isPending: isApproving } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  // Swap
  const { data: swapHash, writeContract: swapWrite, isPending: isSwapping } = useWriteContract()
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({ hash: swapHash })

  const needsApproval = allowance !== undefined && amountInBigInt > 0n && allowance < amountInBigInt

  const handleApprove = useCallback(() => {
    approveWrite({
      address: tokenAddr(fromToken),
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AERODROME.routerV2, BigInt(2) ** BigInt(256) - BigInt(1)],
    })
  }, [fromToken, approveWrite])

  const handleSwap = useCallback(() => {
    if (amountInBigInt === 0n || !address) return
    swapWrite({
      address: AERODROME.routerV2,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountInBigInt, amountOutMin, path, address, BigInt(Math.floor(Date.now() / 1000) + 1200)],
    })
  }, [amountInBigInt, amountOutMin, path, address, swapWrite])

  const flipTokens = useCallback(() => {
    setFromToken(toToken)
    setToToken(fromToken)
    setAmountIn('')
  }, [fromToken, toToken])

  const fromBalance = (balances?.[0]?.result as bigint) ?? 0n
  const toBalance = (balances?.[1]?.result as bigint) ?? 0n
  const fromMeta = TOKEN_META[fromToken]
  const toMeta = TOKEN_META[toToken]

  const isBusy = isApproving || isApproveConfirming || isSwapping || isSwapConfirming
  const txHash = swapHash || approveHash

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ArrowDownUp className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Connect your wallet to swap tokens</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TokenIcon tokenKey="au" size={20} fallback="Au" />
          Swap
        </h1>
        <button onClick={() => setShowSettings(!showSettings)} className="rounded-lg p-2 hover:bg-accent transition-colors">
          <Settings className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {showSettings && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="text-sm font-medium">Slippage Tolerance</div>
          <div className="flex gap-2">
            {[0.1, 0.5, 1.0].map((s) => (
              <button key={s} onClick={() => setSlippage(s)} className={cn('rounded-lg px-3 py-1.5 text-sm', slippage === s ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground')}>
                {s}%
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* From */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">From</span>
            <span className="text-muted-foreground">Balance: {formatOutput(fromBalance, fromDecimals)}</span>
          </div>
          <div className="flex gap-3 items-center">
            <select value={fromToken} onChange={(e) => { setFromToken(e.target.value as TokenKey); setAmountIn('') }}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium min-w-[120px]">
              {TOKEN_LIST.filter((t) => t !== toToken).map((t) => (
                <option key={t} value={t}>{TOKEN_META[t].symbol}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TokenIcon tokenKey={fromToken} size={14} fallback={TOKEN_META[fromToken].symbol} />
            </div>
            <input type="number" placeholder="0.0" value={amountIn} onChange={(e) => setAmountIn(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-right text-lg font-mono focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex gap-2">
            {['25', '50', '75', '100'].map((pct) => (
              <button key={pct} onClick={() => { const bal = Number(fromBalance) / 10 ** fromDecimals; setAmountIn((bal * parseInt(pct) / 100).toFixed(Math.min(fromDecimals, 6))); }}
                className="rounded px-2 py-0.5 text-xs bg-accent hover:bg-accent/80 transition-colors">{pct}%</button>
            ))}
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center">
          <button onClick={flipTokens} className="rounded-full border border-border p-2.5 hover:bg-accent transition-colors active:rotate-180 duration-300">
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        {/* To */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">To</span>
            <span className="text-muted-foreground">Balance: {formatOutput(toBalance, toDecimals)}</span>
          </div>
          <div className="flex gap-3 items-center">
            <div className="rounded-lg border border-border bg-accent px-3 py-2.5 text-sm font-medium min-w-[100px] text-center">
              {toMeta.icon} {toMeta.symbol}
            </div>
            <div className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-right text-lg font-mono">
              {isQuoting ? <Loader2 className="h-5 w-5 animate-spin inline" /> : amountOut > 0n ? formatOutput(amountOut, toDecimals) : '0.0'}
            </div>
          </div>
        </div>

        {/* Rate Info */}
        {amountOut > 0n && amountInBigInt > 0n && (
          <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
            <div className="flex justify-between">
              <span>Rate</span>
              <span>1 {fromMeta.symbol} = {formatOutput(amountOut * BigInt(10 ** fromDecimals) / amountInBigInt, toDecimals)} {toMeta.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Min Received</span>
              <span>{formatOutput(amountOutMin, toDecimals)} {toMeta.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Fee</span>
              <span>0.09% (9 bps), 50% burned</span>
            </div>
            <div className="flex justify-between">
              <span>Route</span>
              <span>{path.map((p) => Object.entries(TOKENS).find(([, v]) => v.toLowerCase() === p.toLowerCase())?.[0]?.toUpperCase() ?? '??').join(' → ')}</span>
            </div>
          </div>
        )}

        {/* Action */}
        {needsApproval ? (
          <button onClick={handleApprove} disabled={isBusy} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isBusy ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Approving...</span> : `Approve ${fromMeta.symbol}`}
          </button>
        ) : (
          <button onClick={handleSwap} disabled={isBusy || amountInBigInt === 0n} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isSwapping || isSwapConfirming ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Swapping...</span>
              : isSwapSuccess ? 'Swap Complete!' : `Swap ${fromMeta.symbol} → ${toMeta.symbol}`}
          </button>
        )}

        {/* TX Link */}
        {txHash && (
          <a href={`${EXPLORER.url}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View on BaseScan <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

function useSwapPath(from: TokenKey, to: TokenKey): `0x${string}`[] {
  const fromAddr = tokenAddr(from)
  const toAddr = tokenAddr(to)
  const weth = TOKENS.weth

  if (fromAddr.toLowerCase() === toAddr.toLowerCase()) return [fromAddr]

  // Direct if both are known pool pairs
  const knownDirect: [TokenKey, TokenKey][] = [['au', 'ag'], ['ag', 'au']]
  const isDirect = knownDirect.some(([a, b]) => a === from && b === to)

  if (isDirect) return [fromAddr, toAddr]

  // Route through WETH
  if (fromAddr.toLowerCase() === weth.toLowerCase()) return [fromAddr, toAddr]
  if (toAddr.toLowerCase() === weth.toLowerCase()) return [fromAddr, toAddr]

  return [fromAddr, weth, toAddr]
}
