import React from 'react'
import { motion } from 'framer-motion'
import { useOraclePrices } from '@/hooks/use-oracle.ts'

export const FlywheelMonitor = () => {
  const { prices, isLoading } = useOraclePrices()

  if (isLoading) return <div className="text-gray-500 animate-pulse">Initializing Flywheel Stream...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-black border border-zinc-800 rounded-2xl shadow-2xl">
      {/* Treasury Pulse */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Treasury Pulse</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Au Balance</span>
            <span className="text-yellow-500 font-mono font-bold">1,250,000.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Ag Balance</span>
            <span className="text-zinc-300 font-mono font-bold">45,000,000.00</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">ETH Reserve</span>
            <span className="text-blue-400 font-mono font-bold">12.45</span>
          </div>
        </div>
      </div>

      {/* PID Emission Gauge */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">PID Emission State</h3>
        <div className="flex flex-col items-center justify-center h-20">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl font-black text-green-400"
          >
            STABLE GROWTH
          </motion.div>
          <span className="text-[10px] text-zinc-500 mt-1">Current Emission: 450 Ag / Block</span>
        </div>
      </div>

      {/* Velocity Ticker */}
      <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Velocity Ticker</h3>
        <div className="text-[11px] font-mono space-y-1 overflow-hidden h-20">
          <div className="text-green-500">✓ Treasury + 0.2 ETH (Swap Fee)</div>
          <div className="text-zinc-400">→ Ag Mint: 450 tokens distributed</div>
          <div className="text-blue-400">ℹ LP Stake: 1,000 Au added</div>
          <div className="text-zinc-400">→ PID Adjustment: -2% (Stabilizing)</div>
        </div>
      </div>
    </div>
  )
}
