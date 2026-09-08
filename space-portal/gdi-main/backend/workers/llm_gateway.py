"""
LLM Gateway — Dual-tier inference via HuggingFace Router
=========================================================
Tier 1 (FAST):  Cerebras llama3.1-8b  — 0.01s, classification/tagging
Tier 2 (DEEP):  SambaNova DeepSeek-V3 — 1-2s, structured analysis

Both free. Both through a single HF token.
"""

import os
import json
import time
import asyncio
import logging
from typing import Optional
from dataclasses import dataclass

import aiohttp

log = logging.getLogger("gdi.llm")

HF_TOKEN = os.environ.get("HF_TOKEN", "")
HF_ROUTER = "https://router.huggingface.co"

# ─── Model Registry ──────────────────────────────────────────

@dataclass
class ModelSpec:
    provider: str       # cerebras, sambanova
    model_id: str       # model name for API
    max_tokens: int     # default max output
    temperature: float  # default temp
    tier: str           # "fast" or "deep"

MODELS = {
    "fast": ModelSpec(
        provider="cerebras",
        model_id="llama3.1-8b",
        max_tokens=100,
        temperature=0.1,
        tier="fast"
    ),
    "deep": ModelSpec(
        provider="sambanova",
        model_id="DeepSeek-V3-0324",
        max_tokens=1000,
        temperature=0.15,
        tier="deep"
    ),
    "reasoning": ModelSpec(
        provider="sambanova",
        model_id="DeepSeek-R1-0528",
        max_tokens=2000,
        temperature=0.1,
        tier="reasoning"
    ),
}

# ─── Rate Limiting ───────────────────────────────────────────

class RateLimiter:
    """Token bucket rate limiter per provider."""
    def __init__(self, calls_per_minute: int = 30):
        self.max_calls = calls_per_minute
        self.window = 60.0
        self.calls: list[float] = []

    async def acquire(self):
        now = time.monotonic()
        self.calls = [t for t in self.calls if now - t < self.window]
        if len(self.calls) >= self.max_calls:
            wait = self.window - (now - self.calls[0])
            log.warning(f"Rate limited, waiting {wait:.1f}s")
            await asyncio.sleep(wait)
        self.calls.append(time.monotonic())

_limiters: dict[str, RateLimiter] = {
    "cerebras": RateLimiter(calls_per_minute=60),   # generous
    "sambanova": RateLimiter(calls_per_minute=30),
}

# ─── Inference Engine ────────────────────────────────────────

class LLMGateway:
    """Async LLM inference through HuggingFace Router."""

    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._stats = {"fast": {"calls": 0, "errors": 0, "total_ms": 0},
                       "deep": {"calls": 0, "errors": 0, "total_ms": 0}}

    async def _ensure_session(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30, connect=10),
                headers={"Authorization": f"Bearer {HF_TOKEN}",
                         "Content-Type": "application/json"}
            )

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def classify(self, prompt: str, system: str = "",
                       max_tokens: int = 50) -> Optional[str]:
        """Fast classification using Cerebras tier."""
        return await self._infer("fast", prompt, system, max_tokens)

    async def analyze(self, prompt: str, system: str = "",
                      max_tokens: int = 800) -> Optional[str]:
        """Deep analysis using SambaNova DeepSeek tier."""
        return await self._infer("deep", prompt, system, max_tokens)

    async def analyze_json(self, prompt: str, system: str = "",
                           max_tokens: int = 800) -> Optional[dict]:
        """Deep analysis, parse response as JSON."""
        raw = await self._infer("deep", prompt, system, max_tokens)
        if raw is None:
            return None
        return self._parse_json(raw)

    async def _infer(self, tier: str, prompt: str, system: str,
                     max_tokens: int) -> Optional[str]:
        """Core inference call."""
        if not HF_TOKEN:
            log.error("HF_TOKEN not set — LLM inference disabled")
            return None

        spec = MODELS[tier]
        limiter = _limiters.get(spec.provider)
        if limiter:
            await limiter.acquire()

        await self._ensure_session()

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        url = f"{HF_ROUTER}/{spec.provider}/v1/chat/completions"
        payload = {
            "model": spec.model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": spec.temperature,
        }

        t0 = time.monotonic()
        try:
            async with self._session.post(url, json=payload) as resp:
                elapsed = (time.monotonic() - t0) * 1000
                self._stats[tier]["calls"] += 1
                self._stats[tier]["total_ms"] += elapsed

                if resp.status != 200:
                    body = await resp.text()
                    log.error(f"LLM {tier} error {resp.status}: {body[:200]}")
                    self._stats[tier]["errors"] += 1
                    return None

                data = await resp.json()
                content = data["choices"][0]["message"]["content"]
                log.debug(f"LLM {tier} [{spec.model_id}] {elapsed:.0f}ms, "
                         f"{data.get('usage', {}).get('completion_tokens', '?')} tokens")
                return content

        except asyncio.TimeoutError:
            log.error(f"LLM {tier} timeout after {(time.monotonic() - t0)*1000:.0f}ms")
            self._stats[tier]["errors"] += 1
            return None
        except Exception as e:
            log.error(f"LLM {tier} exception: {e}")
            self._stats[tier]["errors"] += 1
            return None

    @staticmethod
    def _parse_json(raw: str) -> Optional[dict]:
        """Extract JSON from LLM response, handling markdown fences."""
        text = raw.strip()
        # Strip markdown code fences
        if text.startswith("```"):
            lines = text.split("\n")
            lines = lines[1:]  # remove ```json
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object/array in the text
            for start_char, end_char in [("{", "}"), ("[", "]")]:
                start = text.find(start_char)
                end = text.rfind(end_char)
                if start != -1 and end != -1 and end > start:
                    try:
                        return json.loads(text[start:end+1])
                    except json.JSONDecodeError:
                        continue
            log.warning(f"Failed to parse JSON from LLM response: {text[:100]}")
            return None

    @property
    def stats(self) -> dict:
        result = {}
        for tier, s in self._stats.items():
            avg = s["total_ms"] / s["calls"] if s["calls"] > 0 else 0
            result[tier] = {
                "calls": s["calls"],
                "errors": s["errors"],
                "avg_latency_ms": round(avg, 1),
                "error_rate": round(s["errors"] / max(s["calls"], 1) * 100, 1)
            }
        return result


# ─── Singleton ────────────────────────────────────────────────

llm = LLMGateway()
