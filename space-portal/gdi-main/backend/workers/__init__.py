"""
GDI Intelligence Workers
========================
Autonomous daemon loops that ingest, classify, and analyze global intelligence data.

Architecture:
  Worker → LLM (Cerebras/SambaNova via HF Router) → Redis Stream → WebSocket → Globe

Workers:
  - FININT: Financial intelligence (Binance, FRED, Alpha Vantage, NewsAPI)
  - OSINT:  Open source intelligence (RSS feeds, NewsAPI, entity extraction)
  - GEOINT: Geospatial intelligence (satellite passes, conjunctions, TLE)
"""
