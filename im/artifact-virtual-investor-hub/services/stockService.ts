export interface StockTick {
  timestamp: number;
  price: number;
  volume: number;
}

class StockService {
  private currentPrice = 0;
  private history: StockTick[] = [];
  private listeners: Set<(data: { current: number, history: StockTick[], priceChange: number, percentChange: number }) => void> = new Set();
  private fetchInterval: any;
  private isFetching = false;
  private lastPriceChange = 0;
  private lastPercentChange = 0;
  
  constructor() {
    this.startLiveUpdates();
  }

  private symbol = 'AVRT';

  private generateHistoricalPoints(currentPrice: number, percentChange24h: number) {
     const points: StockTick[] = [];
     let price = currentPrice;
     const now = Date.now();
     // Generate backwards from current
     // Try to roughly approximate the 24h change over the path
     const totalWarp = (price * percentChange24h) / (100 + percentChange24h);
     const stepWarp = totalWarp / 60;

     for(let i = 0; i <= 60; i++) {
        points.unshift({
          timestamp: now - i * 60000,
          price: price,
          volume: Math.floor(Math.random() * 50000)
        });
        price = Math.max(0.000001, price - stepWarp + ((Math.random() - 0.5) * currentPrice * 0.05));
     }
     this.history = points;
  }

  private async fetchPriceData() {
    if (this.isFetching) return;
    this.isFetching = true;
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/0x031a0ba2e7f29d10ddd229f844723261a42aecf6');
      if (!response.ok) return;
      
      const data = await response.json();
      console.log("Dexscreener data:", data);
      const pairs = data.pairs || [];
      if (pairs.length > 0) {
        // Find the base pair, fallback to first pair just in case
        const basePair = pairs.find((p: any) => p.chainId === 'base');
        const pair = basePair || pairs[0];
        
        if (pair.baseToken?.symbol) {
          this.symbol = pair.baseToken.symbol;
        }

        const price = parseFloat(pair.priceUsd);
        const validPrice = !isNaN(price) && price > 0 ? price : 0;
        
        if (validPrice === 0) {
           throw new Error("Invalid price returned from API");
        }

        const volume = parseFloat(pair.volume?.h24) || 0;
        const priceChange24h = parseFloat(pair.priceChange?.h24) || 0;

        if (this.history.length === 0) {
           this.generateHistoricalPoints(validPrice, priceChange24h);
        }

        this.currentPrice = validPrice;
        this.lastPercentChange = priceChange24h;
        this.lastPriceChange = (validPrice * priceChange24h) / (100 + priceChange24h);

        const newTick = {
           timestamp: Date.now(),
           price: this.currentPrice,
           volume: volume
        };

        this.history.push(newTick);
        if (this.history.length > 60) this.history.shift();
        
        this.notifyListeners();
      } else {
        // Fallback if no pairs found for the token
        this.generateFallbackData();
      }
    } catch (error) {
      console.error('Failed to fetch token price', error);
      this.generateFallbackData();
    } finally {
      this.isFetching = false;
    }
  }

  private generateFallbackData() {
    if (this.history.length > 0) {
      // Simulate live tick
      this.currentPrice = Math.max(0.000001, this.currentPrice + (Math.random() - 0.5) * 0.0001);
      this.history.push({
         timestamp: Date.now(),
         price: this.currentPrice,
         volume: Math.floor(Math.random() * 50000)
      });
      if (this.history.length > 60) this.history.shift();
      const firstPrice = this.history[0].price;
      this.lastPriceChange = this.currentPrice - firstPrice;
      this.lastPercentChange = (this.lastPriceChange / firstPrice) * 100;
      this.notifyListeners();
      return;
    }
    
    let price = 0.0042; // Example small price
    const now = Date.now();
    for(let i = 60; i >= 0; i--) {
       this.history.push({
         timestamp: now - i * 60000, // 1 minute intervals for history
         price: price,
         volume: Math.floor(Math.random() * 1000000)
       });
       price = price + (Math.random() - 0.45) * 0.0001;
    }
    this.currentPrice = price;
    this.lastPriceChange = (Math.random() - 0.5) * 0.0005;
    this.lastPercentChange = (this.lastPriceChange / price) * 100;
    this.notifyListeners();
  }

  private startLiveUpdates() {
     this.fetchPriceData();
     this.fetchInterval = setInterval(() => {
        this.fetchPriceData();
     }, 15000); // 15 seconds
  }
  
  private notifyListeners() {
     this.listeners.forEach(l => l({
       current: this.currentPrice,
       history: [...this.history],
       priceChange: this.lastPriceChange,
       percentChange: this.lastPercentChange,
       symbol: this.symbol
     }));
  }

  subscribe(listener: (data: any) => void) {
    this.listeners.add(listener);
    
    if (this.history.length > 0) {
      listener({
         current: this.currentPrice,
         history: [...this.history],
         priceChange: this.lastPriceChange,
         percentChange: this.lastPercentChange,
         symbol: this.symbol
      });
    }

    return () => this.listeners.delete(listener);
  }
}

export const stockService = new StockService();
