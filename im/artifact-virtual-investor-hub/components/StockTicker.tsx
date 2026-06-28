import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { stockService } from '../services/stockService';

export const StockTicker = () => {
  const [data, setData] = useState({
    current: 0,
    priceChange: 0,
    percentChange: 0,
    symbol: 'AVRT'
  });

  useEffect(() => {
    const unsubscribe = stockService.subscribe((newData) => {
      setData(newData);
    });
    return unsubscribe;
  }, []);

  if (data.current === 0) return (
    <div className="flex items-center gap-4 bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-2 backdrop-blur-sm animate-pulse">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-zinc-500" />
        <span className="font-bold text-zinc-500 tracking-widest">AVRT</span>
      </div>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-zinc-500 font-medium">Loading...</span>
      </div>
    </div>
  );

  const isPositive = data.priceChange >= 0;
  
  // Format based on price size
  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toFixed(8);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  return (
    <div className="flex items-center gap-4 bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-zinc-400" />
        <span className="font-bold text-white tracking-widest uppercase">{data.symbol || 'AVRT'}</span>
      </div>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-white font-medium">${formatPrice(data.current)}</span>
        <span className={`flex items-center text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
          ${formatPrice(Math.abs(data.priceChange))} ({Math.abs(data.percentChange).toFixed(2)}%)
        </span>
      </div>
    </div>
  );
};
