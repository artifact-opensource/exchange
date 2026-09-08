"""
GDI — SATx Backend Configuration

All settings for database, API server, SATx integration, and alerting.
Override via environment variables or .env file.
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DatabaseConfig:
    """PostgreSQL + PostGIS connection settings."""
    host: str = os.getenv("GDI_DB_HOST", "localhost")
    port: int = int(os.getenv("GDI_DB_PORT", "5432"))
    name: str = os.getenv("GDI_DB_NAME", "gdi_satx")
    user: str = os.getenv("GDI_DB_USER", "gdi")
    password: str = os.getenv("GDI_DB_PASSWORD", "gdi_secret")
    min_pool: int = int(os.getenv("GDI_DB_MIN_POOL", "2"))
    max_pool: int = int(os.getenv("GDI_DB_MAX_POOL", "10"))

    @property
    def dsn(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

    @property
    def async_dsn(self) -> str:
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


@dataclass
class APIConfig:
    """FastAPI server settings."""
    host: str = os.getenv("GDI_API_HOST", "0.0.0.0")
    port: int = int(os.getenv("GDI_API_PORT", "8600"))
    cors_origins: list[str] = field(default_factory=lambda: [
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://localhost:8080",
        "http://localhost:5500",
        "http://localhost:3000",
    ])
    debug: bool = os.getenv("GDI_DEBUG", "false").lower() == "true"
    log_level: str = os.getenv("GDI_LOG_LEVEL", "info")


@dataclass
class SATxConfig:
    """SATx data pipeline paths and settings."""
    # Base directory where SATx outputs data
    data_dir: Path = Path(os.getenv("SATX_DATA_DIR", "/opt/satx/data"))

    # Subdirectories within data_dir
    tle_dir: str = "tle"                    # TLE catalog files
    passes_dir: str = "passes"              # Pass prediction CSVs
    recordings_dir: str = "recordings"      # IQ recordings
    candidates_dir: str = "candidates"      # Signal detection CSVs
    logs_dir: str = "logs"                  # SATx logs
    spectrograms_dir: str = "spectrograms"  # Spectrogram images

    # Watch mode settings
    watch_interval: int = int(os.getenv("SATX_WATCH_INTERVAL", "5"))  # seconds
    enable_watch: bool = os.getenv("SATX_WATCH", "true").lower() == "true"

    # SGP4 propagation
    propagation_steps: int = 180            # points per orbit for ground track
    tle_refresh_hours: int = 24             # how often to refresh TLEs from CelesTrak

    # CelesTrak endpoints for TLE fetching
    celestrak_urls: list[str] = field(default_factory=lambda: [
        "https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle",
        "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
        "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
    ])

    @property
    def tle_path(self) -> Path:
        return self.data_dir / self.tle_dir

    @property
    def passes_path(self) -> Path:
        return self.data_dir / self.passes_dir

    @property
    def recordings_path(self) -> Path:
        return self.data_dir / self.recordings_dir

    @property
    def candidates_path(self) -> Path:
        return self.data_dir / self.candidates_dir

    @property
    def spectrograms_path(self) -> Path:
        return self.data_dir / self.spectrograms_dir


@dataclass
class WebSocketConfig:
    """WebSocket push settings."""
    ping_interval: int = 30                 # seconds between pings
    ping_timeout: int = 10                  # seconds to wait for pong
    max_connections: int = 100
    broadcast_interval: float = 1.0         # seconds between broadcast ticks


@dataclass
class AlertConfig:
    """Alert threshold configuration."""
    # SNR thresholds
    snr_warning: float = float(os.getenv("GDI_ALERT_SNR_WARNING", "15.0"))
    snr_critical: float = float(os.getenv("GDI_ALERT_SNR_CRITICAL", "25.0"))

    # Confidence thresholds
    confidence_alert: float = 0.7           # trigger alert above this confidence

    # Frequency drift
    drift_hz_threshold: float = 5000.0      # Hz — alert if signal drifts more than this

    # Auto-acknowledge after N hours
    auto_ack_hours: Optional[int] = None    # None = never auto-ack

    # Maximum unacknowledged alerts before escalation
    max_unack: int = 50


@dataclass
class GDIConfig:
    """Root configuration object."""
    db: DatabaseConfig = field(default_factory=DatabaseConfig)
    api: APIConfig = field(default_factory=APIConfig)
    satx: SATxConfig = field(default_factory=SATxConfig)
    ws: WebSocketConfig = field(default_factory=WebSocketConfig)
    alerts: AlertConfig = field(default_factory=AlertConfig)

    # Station identity (this ground station)
    station_name: str = os.getenv("GDI_STATION_NAME", "GDI-PRIMARY")
    station_lat: float = float(os.getenv("GDI_STATION_LAT", "33.6844"))   # Default ground station
    station_lon: float = float(os.getenv("GDI_STATION_LON", "73.0479"))
    station_elev: float = float(os.getenv("GDI_STATION_ELEV", "508.0"))   # meters


# ── Singleton ────────────────────────────────────────────────────────

config = GDIConfig()
