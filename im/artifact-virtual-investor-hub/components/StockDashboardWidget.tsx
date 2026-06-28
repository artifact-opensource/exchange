import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign, Clock, BarChart2 } from 'lucide-react';
import { stockService } from '../services/stockService';

export const StockDashboardWidget = () => {
  const [data, setData] = useState({
    current: 0,
    history: [],
    priceChange: 0,
    percentChange: 0,
    symbol: 'AVRT'
  });

  useEffect(() => {
    const unsubscribe = stockService.subscribe((newData) => {
      // Format timestamps for the chart
      const formattedHistory = newData.history.map((tick: any) => ({
        ...tick,
        time: new Date(tick.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
      
      setData({
        ...newData,
        history: formattedHistory
      });
    });
    return unsubscribe;
  }, []);

  if (data.current === 0) return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 animate-pulse col-span-1 md:col-span-3 h-[400px] flex flex-col items-center justify-center">
      <Activity className="h-8 w-8 text-teal-500 animate-spin mb-4" />
      <span className="text-zinc-500 font-medium">Connecting to DEX feed...</span>
    </div>
  );

  const isPositive = data.priceChange >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444'; // emerald-500 or red-500
  const fillColor = isPositive ? 'url(#colorEmerald)' : 'url(#colorRed)';

  // Format based on price size
  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toFixed(8);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  // Calculate volume for the current period
  const currentVolume = data.history.length > 0 
    ? data.history[data.history.length - 1].volume 
    : 0;

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 col-span-1 md:col-span-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-zinc-400 text-sm font-medium">Internal Valuation ({data.symbol || 'AVRT'})</h3>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-[10px] font-bold uppercase tracking-wider border border-teal-500/20">
              Live
            </span>
          </div>
          <div className="flex items-end gap-3 font-mono">
            <span className="text-4xl font-bold text-white">${formatPrice(data.current)}</span>
            <div className={`flex items-center mb-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="h-5 w-5 mr-1" /> : <ArrowDownRight className="h-5 w-5 mr-1" />}
              <span className="text-lg font-medium">
                {isPositive ? '+' : '-'}${formatPrice(Math.abs(data.priceChange))} ({Math.abs(data.percentChange).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><Clock className="h-3 w-3" /> Last Output</span>
            <span className="text-zinc-300 font-mono text-sm">{data.history.length > 0 ? data.history[data.history.length - 1].time : '--:--:--'}</span>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex flex-col">
             <span className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><BarChart2 className="h-3 w-3" /> Volume (Tick)</span>
             <span className="text-zinc-300 font-mono text-sm">{currentVolume.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="flex flex-col">
             <span className="text-zinc-500 text-xs flex items-center gap-1 mb-1"><DollarSign className="h-3 w-3" /> Market Cap (Est)</span>
             <span className="text-zinc-300 font-mono text-sm">${(data.current * 10000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              hide 
            />
            <YAxis 
              domain={['auto', 'auto']} 
              hide 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '0.5rem' }}
              itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={strokeColor} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={fillColor} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
