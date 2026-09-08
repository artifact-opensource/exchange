"""
VALKYRIE Capability Detection & Auto-Configuration
===================================================

Transformer-style: detect available hardware/software/APIs,
build capability profile, gracefully degrade to what's available.

Full hardware (RTL-SDR dongle) = sovereign SIGINT
No hardware = API-fed SIGINT (WebSDR, SatNOGS, public feeds)

The system senses what it has and becomes whatever it can be.
"""

import subprocess
import shutil
import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger("valkyrie.capabilities")

# ── Capability Tiers ─────────────────────────────────────────────────

TIER_SOVEREIGN = "sovereign"    # Full hardware, air-gap capable
TIER_ENHANCED  = "enhanced"     # Some hardware + API feeds
TIER_API       = "api"          # API-only, no local hardware
TIER_MINIMAL   = "minimal"      # Bare minimum, cached data only


@dataclass
class HardwareProfile:
    """Detected hardware capabilities."""
    rtlsdr: bool = False
    rtlsdr_devices: int = 0
    rtlsdr_info: list = field(default_factory=list)
    gpu_available: bool = False
    gpu_type: str = ""
    gpu_vram_mb: int = 0
    antenna_connected: bool = False  # inferred from SDR signal quality
    usb_devices: list = field(default_factory=list)


@dataclass
class SoftwareProfile:
    """Detected software capabilities."""
    # SDR tools
    rtl_sdr: bool = False
    rtl_tcp: bool = False
    rtl_fm: bool = False
    gqrx: bool = False
    gnuradio: bool = False
    gr_satellites: bool = False
    multimon_ng: bool = False
    
    # Satellite tools
    skyfield: bool = False
    sgp4: bool = False
    gpredict: bool = False
    
    # ML/AI
    torch: bool = False
    tensorflow: bool = False
    numpy: bool = False
    scipy: bool = False
    librosa: bool = False
    
    # Processing
    sox: bool = False
    ffmpeg: bool = False
    
    # SATx project
    satx_project: bool = False
    satx_path: str = ""


@dataclass
class DataProfile:
    """Available data sources and caches."""
    # Local caches
    tle_cache: bool = False
    tle_cache_age_hours: float = -1
    tle_satellite_count: int = 0
    satnogs_cache: bool = False
    signal_recordings: int = 0
    ml_model_available: bool = False
    
    # API feeds (reachability)
    celestrak_api: bool = False
    satnogs_api: bool = False
    opensky_api: bool = False      # flights (already in GDI)
    aisstream_api: bool = False    # ship tracking
    usgs_api: bool = False         # seismic (already in GDI)
    sentinel_api: bool = False     # satellite imagery
    websdr_available: bool = False # remote SDR access
    
    # OSINT feeds
    newsapi: bool = False
    twitter_api: bool = False
    blockchain_rpc: bool = False
    
    # Financial market APIs
    alpha_vantage: bool = False
    binance_api: bool = False
    fred_api: bool = False
    econ_cal_api: bool = False
    marketflow_api: bool = False


@dataclass 
class CapabilityProfile:
    """Complete system capability snapshot."""
    tier: str = TIER_MINIMAL
    hardware: HardwareProfile = field(default_factory=HardwareProfile)
    software: SoftwareProfile = field(default_factory=SoftwareProfile)
    data: DataProfile = field(default_factory=DataProfile)
    detected_at: str = ""
    modules_available: list = field(default_factory=list)
    modules_degraded: list = field(default_factory=list)
    modules_unavailable: list = field(default_factory=list)

    def to_dict(self):
        return asdict(self)

    def summary(self) -> str:
        lines = [
            f"═══ VALKYRIE CAPABILITY PROFILE ═══",
            f"  Tier: {self.tier.upper()}",
            f"  Detected: {self.detected_at}",
            f"",
            f"  Hardware:",
            f"    RTL-SDR: {'✓ (' + str(self.hardware.rtlsdr_devices) + ' devices)' if self.hardware.rtlsdr else '✗ (degraded to API feeds)'}",
            f"    GPU: {self.hardware.gpu_type if self.hardware.gpu_available else 'CPU-only'}",
            f"",
            f"  Modules ACTIVE: {', '.join(self.modules_available) or 'none'}",
            f"  Modules DEGRADED: {', '.join(self.modules_degraded) or 'none'}",
            f"  Modules OFFLINE: {', '.join(self.modules_unavailable) or 'none'}",
            f"═══════════════════════════════════",
        ]
        return "\n".join(lines)


# ── Detection Functions ──────────────────────────────────────────────

def _check_binary(name: str) -> bool:
    """Check if a binary is available on PATH."""
    return shutil.which(name) is not None


def _check_python_module(name: str) -> bool:
    """Check if a Python module is importable."""
    try:
        result = subprocess.run(
            ["python3", "-c", f"import {name}"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


def _check_rtlsdr() -> tuple:
    """Detect RTL-SDR hardware. Returns (found: bool, device_count: int, info: list)."""
    if not _check_binary("rtl_test"):
        return False, 0, []
    
    try:
        result = subprocess.run(
            ["rtl_test", "-t"],
            capture_output=True, text=True, timeout=10
        )
        output = result.stdout + result.stderr
        
        if "Found" in output and "device" in output:
            # Parse device count
            for line in output.split("\n"):
                if "Found" in line and "device" in line:
                    try:
                        count = int(line.split("Found")[1].strip().split()[0])
                        return True, count, [line.strip()]
                    except (ValueError, IndexError):
                        pass
            return True, 1, [output[:200]]
        return False, 0, []
    except subprocess.TimeoutExpired:
        # rtl_test hangs if device is found and working (it runs continuous test)
        # A timeout actually means device IS present
        return True, 1, ["Device detected (test timed out — device responsive)"]
    except Exception as e:
        logger.debug(f"RTL-SDR check failed: {e}")
        return False, 0, []


def _check_gpu() -> tuple:
    """Detect GPU. Returns (available: bool, type: str, vram_mb: int)."""
    # NVIDIA
    if _check_binary("nvidia-smi"):
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 and result.stdout.strip():
                parts = result.stdout.strip().split(",")
                name = parts[0].strip()
                vram = int(parts[1].strip()) if len(parts) > 1 else 0
                return True, f"NVIDIA {name}", vram
        except Exception:
            pass
    
    # Intel integrated
    try:
        result = subprocess.run(
            ["lspci"], capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.split("\n"):
            if "VGA" in line:
                if "Intel" in line:
                    return True, "Intel iGPU", 0
                elif "AMD" in line or "Radeon" in line:
                    return True, "AMD GPU", 0
    except Exception:
        pass
    
    return False, "", 0


def _check_tle_cache() -> tuple:
    """Check TLE data availability. Returns (exists, age_hours, sat_count)."""
    satx_base = Path("/home/adam/workspace/enterprise/projects/satx")
    
    tle_paths = [
        satx_base / "data" / "tles" / "all-satellites.tle",
        satx_base / "data" / "tle_cache" / "all-satellites.tle",
    ]
    
    for path in tle_paths:
        if path.exists():
            stat = path.stat()
            age_hours = (datetime.now().timestamp() - stat.st_mtime) / 3600
            
            # Count satellites (every 3 lines = 1 satellite)
            try:
                line_count = sum(1 for _ in open(path))
                sat_count = line_count // 3
            except Exception:
                sat_count = 0
            
            return True, age_hours, sat_count
    
    return False, -1, 0


def _check_api_reachability(url: str, timeout: float = 3.0) -> bool:
    """Quick check if an API endpoint is reachable."""
    try:
        import urllib.request
        req = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status < 500
    except Exception:
        try:
            req = urllib.request.Request(url, method="GET")
            resp = urllib.request.urlopen(req, timeout=timeout)
            return resp.status < 500
        except Exception:
            return False


def _load_env_keys(env_path: Path) -> dict:
    """Parse a .env file and return key-value dict (values are non-empty strings or empty)."""
    result = {}
    if not env_path.exists():
        return result
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    # Only count as "set" if non-empty and not a placeholder
                    if value and not value.startswith("your_") and value != "your_key_here":
                        result[key] = value
    except Exception as e:
        logger.debug(f"Failed to parse {env_path}: {e}")
    return result


def _check_recordings() -> int:
    """Count existing signal recordings."""
    satx_base = Path("/home/adam/workspace/enterprise/projects/satx")
    recordings_dir = satx_base / "recordings"
    if not recordings_dir.exists():
        return 0
    
    extensions = {".iq", ".raw", ".wav", ".bin"}
    count = 0
    for f in recordings_dir.rglob("*"):
        if f.suffix.lower() in extensions:
            count += 1
    return count


# ── Main Detection ───────────────────────────────────────────────────

def detect_capabilities(check_apis: bool = True) -> CapabilityProfile:
    """
    Full system capability detection.
    Scans hardware, software, data, and API access.
    
    Args:
        check_apis: If True, test API endpoint reachability (adds ~5s latency)
    
    Returns:
        CapabilityProfile with tier classification and module availability
    """
    profile = CapabilityProfile()
    profile.detected_at = datetime.now(timezone.utc).isoformat()
    
    # ── Hardware ─────────────────────────────────────────────────
    logger.info("Scanning hardware...")
    
    rtlsdr_found, rtlsdr_count, rtlsdr_info = _check_rtlsdr()
    profile.hardware.rtlsdr = rtlsdr_found
    profile.hardware.rtlsdr_devices = rtlsdr_count
    profile.hardware.rtlsdr_info = rtlsdr_info
    
    gpu_found, gpu_type, gpu_vram = _check_gpu()
    profile.hardware.gpu_available = gpu_found
    profile.hardware.gpu_type = gpu_type
    profile.hardware.gpu_vram_mb = gpu_vram
    
    # ── Software ─────────────────────────────────────────────────
    logger.info("Scanning software...")
    
    # SDR tools
    profile.software.rtl_sdr = _check_binary("rtl_sdr")
    profile.software.rtl_tcp = _check_binary("rtl_tcp")
    profile.software.rtl_fm = _check_binary("rtl_fm")
    profile.software.gqrx = _check_binary("gqrx")
    profile.software.gnuradio = _check_binary("gnuradio-companion") or _check_python_module("gnuradio")
    profile.software.gr_satellites = _check_python_module("gr_satellites")
    profile.software.multimon_ng = _check_binary("multimon-ng")
    
    # Satellite tools
    profile.software.skyfield = _check_python_module("skyfield")
    profile.software.sgp4 = _check_python_module("sgp4")
    profile.software.gpredict = _check_binary("gpredict")
    
    # ML/AI
    profile.software.torch = _check_python_module("torch")
    profile.software.tensorflow = _check_python_module("tensorflow")
    profile.software.numpy = _check_python_module("numpy")
    profile.software.scipy = _check_python_module("scipy")
    profile.software.librosa = _check_python_module("librosa")
    
    # Processing
    profile.software.sox = _check_binary("sox")
    profile.software.ffmpeg = _check_binary("ffmpeg")
    
    # SATx project
    satx_path = Path("/home/adam/workspace/enterprise/projects/satx")
    profile.software.satx_project = satx_path.exists()
    profile.software.satx_path = str(satx_path) if satx_path.exists() else ""
    
    # ── Data ─────────────────────────────────────────────────────
    logger.info("Scanning data sources...")
    
    tle_exists, tle_age, tle_count = _check_tle_cache()
    profile.data.tle_cache = tle_exists
    profile.data.tle_cache_age_hours = round(tle_age, 1)
    profile.data.tle_satellite_count = tle_count
    
    profile.data.signal_recordings = _check_recordings()
    
    # ML model
    model_path = satx_path / "models" / "model_v1"
    profile.data.ml_model_available = any(
        model_path.glob("*.pt")
    ) if model_path.exists() else False
    
    # SatNOGS cache
    satnogs_cache = satx_path / "data" / "satnogs_cache"
    profile.data.satnogs_cache = satnogs_cache.exists() and any(satnogs_cache.iterdir()) if satnogs_cache.exists() else False
    
    # API feeds (only if requested — adds latency)
    if check_apis:
        logger.info("Testing API reachability...")
        profile.data.celestrak_api = _check_api_reachability("https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=tle")
        profile.data.satnogs_api = _check_api_reachability("https://db.satnogs.org/api/satellites/")
        profile.data.opensky_api = _check_api_reachability("https://opensky-network.org/api/states/all?lamin=20&lamax=30&lomin=60&lomax=80")
        profile.data.usgs_api = _check_api_reachability("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1")
        profile.data.sentinel_api = _check_api_reachability("https://scihub.copernicus.eu/dhus/api/stub/version")
        profile.data.websdr_available = _check_api_reachability("http://websdr.org/")
        profile.data.aisstream_api = _check_api_reachability("https://aisstream.io/")
    
    # Check for API keys in .env (financial markets, news, etc.)
    env_path = Path("/home/adam/workspace/enterprise/projects/gdi/.env")
    env_vars = _load_env_keys(env_path)
    
    profile.data.newsapi = bool(env_vars.get("NEWSAPI_KEY"))
    profile.data.blockchain_rpc = bool(env_vars.get("BINANCE_API_KEY"))
    
    # Financial market APIs
    profile.data.alpha_vantage = bool(env_vars.get("ALPHA_VANTAGE_KEY"))
    profile.data.binance_api = bool(env_vars.get("BINANCE_API_KEY"))
    profile.data.fred_api = bool(env_vars.get("FRED_API_KEY"))
    profile.data.econ_cal_api = bool(env_vars.get("ECON_CAL_API_KEY"))
    profile.data.marketflow_api = bool(env_vars.get("MARKETFLOW_API_KEY"))
    
    # ── Classify Tier ────────────────────────────────────────────
    if profile.hardware.rtlsdr and profile.software.skyfield:
        if profile.software.gnuradio or profile.software.gr_satellites:
            profile.tier = TIER_SOVEREIGN
        else:
            profile.tier = TIER_ENHANCED
    elif profile.software.skyfield or profile.data.tle_cache:
        profile.tier = TIER_API
    else:
        profile.tier = TIER_MINIMAL
    
    # ── Module Classification ────────────────────────────────────
    _classify_modules(profile)
    
    logger.info(f"Detection complete. Tier: {profile.tier}")
    return profile


def _classify_modules(profile: CapabilityProfile):
    """Classify each VALKYRIE module as available/degraded/unavailable."""
    
    # SIGINT — Signal Intelligence
    if profile.hardware.rtlsdr and profile.software.rtl_sdr:
        profile.modules_available.append("SIGINT")
    elif profile.data.websdr_available or profile.data.satnogs_api:
        profile.modules_degraded.append("SIGINT")  # API-fed only
    else:
        profile.modules_unavailable.append("SIGINT")
    
    # GEOINT — Geospatial Intelligence
    if profile.software.skyfield and profile.data.tle_cache:
        profile.modules_available.append("GEOINT")
    elif profile.data.celestrak_api or profile.data.opensky_api:
        profile.modules_degraded.append("GEOINT")  # no local orbital math
    else:
        profile.modules_unavailable.append("GEOINT")
    
    # OSINT — Open Source Intelligence
    osint_sources = sum([
        profile.data.newsapi,
        profile.data.twitter_api,
        bool(profile.data.econ_cal_api),  # economic calendar = OSINT too
    ])
    if osint_sources >= 2:
        profile.modules_available.append("OSINT")
    elif osint_sources >= 1 or True:  # we always have web scraping
        profile.modules_degraded.append("OSINT")
    else:
        profile.modules_unavailable.append("OSINT")
    
    # FININT — Financial Intelligence
    finint_sources = sum([
        profile.data.binance_api,
        profile.data.alpha_vantage,
        profile.data.fred_api,
        profile.data.econ_cal_api,
        profile.data.marketflow_api,
        profile.data.blockchain_rpc,
    ])
    if finint_sources >= 3:
        profile.modules_available.append("FININT")
    elif finint_sources >= 1:
        profile.modules_degraded.append("FININT")
    else:
        profile.modules_unavailable.append("FININT")
    
    # PREDICT — Statistical Analysis & Anomaly Detection
    if profile.software.numpy and profile.software.scipy:
        if profile.software.torch or profile.software.tensorflow:
            profile.modules_available.append("PREDICT")
        else:
            profile.modules_degraded.append("PREDICT")  # classical stats only
    else:
        profile.modules_unavailable.append("PREDICT")
    
    # REPAIR — Self-healing & monitoring
    # Always available — it's process management
    profile.modules_available.append("REPAIR")
    
    # MARITIME — Ship tracking (AIS)
    if profile.data.aisstream_api:
        profile.modules_available.append("MARITIME")
    else:
        profile.modules_degraded.append("MARITIME")  # cached/scraped only
    
    # IMAGERY — Satellite imagery analysis
    if profile.data.sentinel_api:
        profile.modules_degraded.append("IMAGERY")  # need to add processing
    else:
        profile.modules_unavailable.append("IMAGERY")


# ── Cache & Persistence ──────────────────────────────────────────────

CACHE_PATH = Path("/home/adam/workspace/enterprise/projects/gdi/data/capabilities.json")

def save_profile(profile: CapabilityProfile):
    """Cache capability profile to disk."""
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(profile.to_dict(), f, indent=2)
    logger.info(f"Capability profile cached to {CACHE_PATH}")


def load_cached_profile() -> Optional[CapabilityProfile]:
    """Load cached capability profile if recent enough (< 1 hour)."""
    if not CACHE_PATH.exists():
        return None
    
    try:
        age_hours = (datetime.now().timestamp() - CACHE_PATH.stat().st_mtime) / 3600
        if age_hours > 1.0:
            return None
        
        with open(CACHE_PATH) as f:
            data = json.load(f)
        
        profile = CapabilityProfile(
            tier=data.get("tier", TIER_MINIMAL),
            detected_at=data.get("detected_at", ""),
            modules_available=data.get("modules_available", []),
            modules_degraded=data.get("modules_degraded", []),
            modules_unavailable=data.get("modules_unavailable", []),
        )
        # Reconstruct nested profiles
        hw = data.get("hardware", {})
        profile.hardware = HardwareProfile(**{k: v for k, v in hw.items() if k in HardwareProfile.__dataclass_fields__})
        sw = data.get("software", {})
        profile.software = SoftwareProfile(**{k: v for k, v in sw.items() if k in SoftwareProfile.__dataclass_fields__})
        dp = data.get("data", {})
        profile.data = DataProfile(**{k: v for k, v in dp.items() if k in DataProfile.__dataclass_fields__})
        
        return profile
    except Exception as e:
        logger.warning(f"Failed to load cached profile: {e}")
        return None


def get_capabilities(force_rescan: bool = False, check_apis: bool = True) -> CapabilityProfile:
    """
    Get system capabilities. Uses cache if fresh, otherwise rescans.
    
    This is the main entry point. Call this, not detect_capabilities directly.
    """
    if not force_rescan:
        cached = load_cached_profile()
        if cached:
            logger.info(f"Using cached capability profile (tier: {cached.tier})")
            return cached
    
    profile = detect_capabilities(check_apis=check_apis)
    save_profile(profile)
    return profile


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    
    force = "--force" in sys.argv
    no_api = "--no-api" in sys.argv
    
    profile = get_capabilities(force_rescan=True, check_apis=not no_api)
    print(profile.summary())
    print()
    print(json.dumps(profile.to_dict(), indent=2))
