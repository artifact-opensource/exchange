"""
GDI — SATx Ingestion Pipeline

Reads SATx output files (TLEs, pass predictions, signal candidates, recordings)
and ingests them into PostgreSQL. Can run as:
  - One-shot: python ingest.py --once
  - Daemon:   python ingest.py --watch
  - Cron:     python ingest.py --once (via crontab)

Computes satellite ground track positions for detections using SGP4 propagation.
"""

import argparse
import asyncio
import csv
import hashlib
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import asyncpg

# SGP4 for ground track computation
try:
    from sgp4.api import Satrec, WGS72
    from sgp4.api import jday
    SGP4_AVAILABLE = True
except ImportError:
    SGP4_AVAILABLE = False
    logging.warning("sgp4 not installed — ground track computation disabled")

from config import config

# ── Logging ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("gdi.ingest")


# ── File Tracking ────────────────────────────────────────────────────
# Track which files we've already ingested to avoid duplicates

PROCESSED_HASHES: set[str] = set()


def file_hash(path: Path) -> str:
    """SHA-256 of file contents for dedup."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def already_processed(path: Path) -> bool:
    """Check if a file was already ingested this session."""
    fh = file_hash(path)
    if fh in PROCESSED_HASHES:
        return True
    PROCESSED_HASHES.add(fh)
    return False


# ═══════════════════════════════════════════════════════════════════
#  TLE INGESTION
# ═══════════════════════════════════════════════════════════════════

async def ingest_tle_file(conn: asyncpg.Connection, path: Path) -> int:
    """
    Ingest a TLE file (standard 3-line format):
      SATELLITE NAME
      1 NNNNN ...
      2 NNNNN ...
    
    Returns count of satellites upserted.
    """
    log.info(f"Ingesting TLE file: {path}")
    lines = path.read_text().strip().split("\n")
    count = 0

    i = 0
    while i < len(lines) - 2:
        name_line = lines[i].strip()
        line1 = lines[i + 1].strip()
        line2 = lines[i + 2].strip()

        # Validate TLE format
        if not line1.startswith("1 ") or not line2.startswith("2 "):
            i += 1
            continue

        # Extract NORAD ID from line 1
        try:
            norad_id = int(line1[2:7].strip())
        except ValueError:
            i += 3
            continue

        # Extract international designator
        intl_des = line1[9:17].strip() or None

        # Extract epoch
        epoch_year = int(line1[18:20])
        epoch_day = float(line1[20:32])
        year = 2000 + epoch_year if epoch_year < 57 else 1900 + epoch_year
        epoch = datetime(year, 1, 1, tzinfo=timezone.utc) + \
                __import__("datetime").timedelta(days=epoch_day - 1)

        # Categorize based on name heuristics
        category = _categorize_satellite(name_line)

        await conn.execute(
            """INSERT INTO satellites (norad_id, name, tle_line1, tle_line2,
                                       category, intl_designator, epoch, last_updated)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
               ON CONFLICT (norad_id)
               DO UPDATE SET
                   name = EXCLUDED.name,
                   tle_line1 = EXCLUDED.tle_line1,
                   tle_line2 = EXCLUDED.tle_line2,
                   category = EXCLUDED.category,
                   intl_designator = EXCLUDED.intl_designator,
                   epoch = EXCLUDED.epoch,
                   last_updated = NOW()""",
            norad_id, name_line, line1, line2,
            category, intl_des, epoch,
        )
        count += 1
        i += 3

    log.info(f"  Upserted {count} satellites from {path.name}")
    return count


def _categorize_satellite(name: str) -> str:
    """Heuristic categorization from satellite name."""
    name_upper = name.upper()
    if any(k in name_upper for k in ["NOAA", "METEOR", "METOP", "GOES", "FENGYUN"]):
        return "weather"
    if any(k in name_upper for k in ["STARLINK", "ONEWEB", "IRIDIUM", "GLOBALSTAR", "ORBCOMM"]):
        return "comms"
    if any(k in name_upper for k in ["GPS", "GLONASS", "GALILEO", "BEIDOU", "NAVSTAR"]):
        return "navigation"
    if any(k in name_upper for k in ["AO-", "FO-", "SO-", "AMSAT", "ISS", "ARISS"]):
        return "amateur"
    if any(k in name_upper for k in ["USA ", "NROL", "LACROSSE", "KH-", "MISTY"]):
        return "military"
    if any(k in name_upper for k in ["HUBBLE", "JWST", "CHANDRA", "SWIFT"]):
        return "science"
    if "DEB" in name_upper or "R/B" in name_upper:
        return "debris"
    return "unknown"


# ═══════════════════════════════════════════════════════════════════
#  PASS PREDICTION INGESTION
# ═══════════════════════════════════════════════════════════════════

async def ingest_passes_file(conn: asyncpg.Connection, path: Path) -> int:
    """
    Ingest a pass prediction CSV with columns:
      norad_id, aos_time, los_time, max_elevation, aos_azimuth, los_azimuth
    
    Times in ISO 8601 format.
    """
    log.info(f"Ingesting passes file: {path}")
    count = 0

    with open(path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                norad_id = int(row.get("norad_id", 0))
                aos = datetime.fromisoformat(row["aos_time"].replace("Z", "+00:00"))
                los = datetime.fromisoformat(row["los_time"].replace("Z", "+00:00"))
                max_el = float(row.get("max_elevation", 0))
                aos_az = float(row.get("aos_azimuth", 0)) if row.get("aos_azimuth") else None
                los_az = float(row.get("los_azimuth", 0)) if row.get("los_azimuth") else None
            except (ValueError, KeyError) as e:
                log.warning(f"  Skipping malformed pass row: {e}")
                continue

            # Look up satellite
            sat = await conn.fetchrow(
                "SELECT id FROM satellites WHERE norad_id = $1", norad_id
            )
            if not sat:
                log.debug(f"  Unknown NORAD ID {norad_id} — skipping pass")
                continue

            # Look up station (use default if not specified)
            station_id = None
            station_name = row.get("station")
            if station_name:
                st = await conn.fetchrow(
                    "SELECT id FROM stations WHERE name = $1", station_name
                )
                if st:
                    station_id = st["id"]

            # Upsert pass (deduplicate by satellite + AOS time)
            await conn.execute(
                """INSERT INTO passes (satellite_id, station_id, aos_time, los_time,
                                       max_elevation, aos_azimuth, los_azimuth, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, 'predicted')
                   ON CONFLICT DO NOTHING""",
                sat["id"], station_id, aos, los, max_el, aos_az, los_az,
            )
            count += 1

    log.info(f"  Ingested {count} passes from {path.name}")
    return count


# ═══════════════════════════════════════════════════════════════════
#  CANDIDATES / SIGNAL DETECTION INGESTION
# ═══════════════════════════════════════════════════════════════════

async def ingest_candidates_file(
    conn: asyncpg.Connection,
    path: Path,
    broadcast_fn=None,
) -> int:
    """
    Ingest a candidates.csv with signal detections:
      frequency_hz, snr_db, peak_time, confidence, signal_class,
      modulation_type, protocol, bandwidth_hz, recording_file,
      norad_id (optional)
    
    Computes ground track positions using SGP4 if TLE data is available.
    """
    log.info(f"Ingesting candidates file: {path}")
    count = 0

    with open(path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                freq_hz = float(row["frequency_hz"])
                snr_db = float(row["snr_db"])
                peak_time = datetime.fromisoformat(
                    row["peak_time"].replace("Z", "+00:00")
                )
                confidence = float(row.get("confidence", 0))
                signal_class = row.get("signal_class", "unknown")
                modulation = row.get("modulation_type")
                protocol = row.get("protocol")
                bandwidth = float(row["bandwidth_hz"]) if row.get("bandwidth_hz") else None
                duration_ms = float(row["duration_ms"]) if row.get("duration_ms") else None
            except (ValueError, KeyError) as e:
                log.warning(f"  Skipping malformed candidate row: {e}")
                continue

            # Link to recording if specified
            recording_id = None
            rec_file = row.get("recording_file")
            if rec_file:
                rec = await conn.fetchrow(
                    "SELECT id FROM recordings WHERE file_path LIKE $1",
                    f"%{rec_file}%",
                )
                if rec:
                    recording_id = rec["id"]

            # Link to satellite if NORAD ID specified
            satellite_id = None
            norad_id = row.get("norad_id")
            if norad_id:
                try:
                    sat = await conn.fetchrow(
                        "SELECT id FROM satellites WHERE norad_id = $1",
                        int(norad_id),
                    )
                    if sat:
                        satellite_id = sat["id"]
                except ValueError:
                    pass

            # Compute ground track position via SGP4
            ground_lat = None
            ground_lon = None
            if satellite_id and SGP4_AVAILABLE:
                ground_lat, ground_lon = await _compute_ground_position(
                    conn, satellite_id, peak_time
                )

            # Use explicitly provided lat/lon if available
            if row.get("ground_lat"):
                ground_lat = float(row["ground_lat"])
            if row.get("ground_lon"):
                ground_lon = float(row["ground_lon"])

            # Frequency offset from recording center
            freq_offset = None
            if recording_id and rec_file:
                rec_data = await conn.fetchrow(
                    "SELECT center_frequency FROM recordings WHERE id = $1",
                    recording_id,
                )
                if rec_data:
                    freq_offset = freq_hz - rec_data["center_frequency"]

            # Build metadata
            metadata = {}
            for extra_key in ["waterfall_path", "spectrogram_path", "notes"]:
                if row.get(extra_key):
                    metadata[extra_key] = row[extra_key]

            det_id = await conn.fetchval(
                """INSERT INTO detections (
                       recording_id, satellite_id, frequency_hz, frequency_offset,
                       snr_db, peak_time, duration_ms, confidence, signal_class,
                       modulation_type, protocol, bandwidth_hz,
                       ground_lat, ground_lon, metadata
                   ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                   RETURNING id""",
                recording_id, satellite_id, freq_hz, freq_offset,
                snr_db, peak_time, duration_ms, confidence, signal_class,
                modulation, protocol, bandwidth,
                ground_lat, ground_lon, json.dumps(metadata),
            )

            # Check alert thresholds
            alert = await _check_detection_alert(conn, det_id, snr_db, confidence, signal_class)
            if alert and broadcast_fn:
                await broadcast_fn(alert)

            # Broadcast new detection via WebSocket
            if broadcast_fn:
                await broadcast_fn({
                    "type": "new_detection",
                    "data": {
                        "id": det_id,
                        "frequency_hz": freq_hz,
                        "snr_db": snr_db,
                        "peak_time": peak_time.isoformat(),
                        "confidence": confidence,
                        "signal_class": signal_class,
                        "ground_lat": ground_lat,
                        "ground_lon": ground_lon,
                    },
                })

            count += 1

    log.info(f"  Ingested {count} detections from {path.name}")
    return count


async def _compute_ground_position(
    conn: asyncpg.Connection,
    satellite_id: int,
    at_time: datetime,
) -> tuple[Optional[float], Optional[float]]:
    """Compute satellite ground track position using SGP4."""
    if not SGP4_AVAILABLE:
        return None, None

    sat = await conn.fetchrow(
        "SELECT tle_line1, tle_line2 FROM satellites WHERE id = $1",
        satellite_id,
    )
    if not sat:
        return None, None

    try:
        satrec = Satrec.twoline2rv(sat["tle_line1"], sat["tle_line2"], WGS72)
        jd, fr = jday(
            at_time.year, at_time.month, at_time.day,
            at_time.hour, at_time.minute,
            at_time.second + at_time.microsecond / 1e6,
        )
        e, r, v = satrec.sgp4(jd, fr)
        if e != 0:
            return None, None

        # Convert ECI to geodetic
        import math
        x, y, z = r  # km
        theta = math.atan2(y, x)  # radians
        r_xy = math.sqrt(x * x + y * y)
        lat = math.degrees(math.atan2(z, r_xy))

        # Approximate longitude (ignoring Earth rotation for simplicity)
        # For proper conversion, use GMST
        gmst = _gmst(jd + fr)
        lon = math.degrees(theta - gmst)
        # Normalize to -180..180
        while lon > 180:
            lon -= 360
        while lon < -180:
            lon += 360

        return lat, lon
    except Exception as e:
        log.debug(f"SGP4 error for satellite {satellite_id}: {e}")
        return None, None


def _gmst(jd: float) -> float:
    """Greenwich Mean Sidereal Time in radians."""
    import math
    t = (jd - 2451545.0) / 36525.0
    gmst_deg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + \
               0.000387933 * t * t - t * t * t / 38710000.0
    return math.radians(gmst_deg % 360)


async def _check_detection_alert(
    conn: asyncpg.Connection,
    detection_id: int,
    snr_db: float,
    confidence: float,
    signal_class: str,
) -> Optional[dict]:
    """Check if a detection should trigger an alert."""
    alert_type = None
    severity = "info"
    title = ""
    message = ""

    if snr_db >= config.alerts.snr_critical:
        alert_type = "high_snr"
        severity = "critical"
        title = f"Critical SNR Detection: {snr_db:.1f} dB"
        message = f"Signal detected at {snr_db:.1f} dB SNR exceeds critical threshold ({config.alerts.snr_critical} dB)"
    elif snr_db >= config.alerts.snr_warning:
        alert_type = "high_snr"
        severity = "warning"
        title = f"High SNR Detection: {snr_db:.1f} dB"
        message = f"Signal detected at {snr_db:.1f} dB SNR exceeds warning threshold ({config.alerts.snr_warning} dB)"

    if signal_class == "unknown" and confidence >= config.alerts.confidence_alert:
        alert_type = "new_signal"
        severity = "warning"
        title = f"Unknown Signal (confidence: {confidence:.1%})"
        message = f"Unclassified signal detected with {confidence:.1%} confidence"

    if not alert_type:
        return None

    alert_id = await conn.fetchval(
        """INSERT INTO alerts (detection_id, alert_type, severity, title, message)
           VALUES ($1, $2, $3, $4, $5) RETURNING id""",
        detection_id, alert_type, severity, title, message,
    )

    return {
        "type": "alert",
        "data": {
            "id": alert_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "detection_id": detection_id,
        },
    }


# ═══════════════════════════════════════════════════════════════════
#  RECORDING METADATA INGESTION
# ═══════════════════════════════════════════════════════════════════

async def ingest_recording_metadata(conn: asyncpg.Connection, path: Path) -> int:
    """
    Ingest recording metadata from JSON files:
    {
        "file_path": "recordings/rec_001.cf32",
        "sample_rate": 2400000,
        "center_frequency": 137100000,
        "duration": 900.0,
        "file_size": 8640000000,
        "format": "cf32",
        "gain_db": 40.0,
        "norad_id": 28654,
        "pass_aos": "2026-03-01T00:00:00Z",
        "station": "GDI-PRIMARY"
    }
    """
    log.info(f"Ingesting recording metadata: {path}")

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        log.error(f"  Invalid JSON in {path}: {e}")
        return 0

    # Handle single object or array
    records = data if isinstance(data, list) else [data]
    count = 0

    for rec in records:
        try:
            file_path = rec["file_path"]
            sample_rate = int(rec["sample_rate"])
            center_freq = float(rec["center_frequency"])
        except KeyError as e:
            log.warning(f"  Missing required field {e} in recording metadata")
            continue

        # Link to pass if NORAD ID + AOS provided
        pass_id = None
        norad_id = rec.get("norad_id")
        pass_aos = rec.get("pass_aos")
        if norad_id and pass_aos:
            try:
                aos = datetime.fromisoformat(pass_aos.replace("Z", "+00:00"))
                pass_row = await conn.fetchrow(
                    """SELECT p.id FROM passes p
                       JOIN satellites s ON p.satellite_id = s.id
                       WHERE s.norad_id = $1
                         AND ABS(EXTRACT(EPOCH FROM p.aos_time - $2)) < 60
                       LIMIT 1""",
                    int(norad_id), aos,
                )
                if pass_row:
                    pass_id = pass_row["id"]
            except (ValueError, TypeError):
                pass

        # Link to station
        station_id = None
        station_name = rec.get("station")
        if station_name:
            st = await conn.fetchrow(
                "SELECT id FROM stations WHERE name = $1", station_name
            )
            if st:
                station_id = st["id"]

        await conn.execute(
            """INSERT INTO recordings (
                   pass_id, station_id, file_path, file_size, sample_rate,
                   center_frequency, bandwidth, duration, format, gain_db, metadata
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT DO NOTHING""",
            pass_id, station_id, file_path,
            rec.get("file_size"), sample_rate, center_freq,
            rec.get("bandwidth"), rec.get("duration"),
            rec.get("format", "raw_iq"),
            rec.get("gain_db"),
            json.dumps({k: v for k, v in rec.items()
                       if k not in {"file_path", "sample_rate", "center_frequency",
                                    "file_size", "duration", "format", "gain_db",
                                    "norad_id", "pass_aos", "station"}}),
        )
        count += 1

    log.info(f"  Ingested {count} recordings from {path.name}")
    return count


# ═══════════════════════════════════════════════════════════════════
#  MAIN INGESTION LOOP
# ═══════════════════════════════════════════════════════════════════

async def run_ingestion_cycle(pool: asyncpg.Pool):
    """Run one complete ingestion cycle across all data directories."""
    async with pool.acquire() as conn:
        totals = {"tle": 0, "passes": 0, "recordings": 0, "detections": 0}

        # TLE files
        tle_dir = config.satx.tle_path
        if tle_dir.exists():
            for f in sorted(tle_dir.glob("*.tle")) + sorted(tle_dir.glob("*.txt")):
                if already_processed(f):
                    continue
                totals["tle"] += await ingest_tle_file(conn, f)

        # Pass prediction files
        passes_dir = config.satx.passes_path
        if passes_dir.exists():
            for f in sorted(passes_dir.glob("*.csv")):
                if already_processed(f):
                    continue
                totals["passes"] += await ingest_passes_file(conn, f)

        # Recording metadata
        rec_dir = config.satx.recordings_path
        if rec_dir.exists():
            for f in sorted(rec_dir.glob("*.json")):
                if already_processed(f):
                    continue
                totals["recordings"] += await ingest_recording_metadata(conn, f)

        # Signal candidates
        cand_dir = config.satx.candidates_path
        if cand_dir.exists():
            for f in sorted(cand_dir.glob("*.csv")):
                if already_processed(f):
                    continue
                totals["detections"] += await ingest_candidates_file(conn, f)

        if any(v > 0 for v in totals.values()):
            log.info(f"Ingestion cycle complete: {totals}")
        else:
            log.debug("Ingestion cycle: no new data")


async def watch_mode(pool: asyncpg.Pool):
    """Continuously watch for new data files."""
    log.info(f"Watch mode started — polling every {config.satx.watch_interval}s")
    log.info(f"  TLE dir:        {config.satx.tle_path}")
    log.info(f"  Passes dir:     {config.satx.passes_path}")
    log.info(f"  Recordings dir: {config.satx.recordings_path}")
    log.info(f"  Candidates dir: {config.satx.candidates_path}")

    while True:
        try:
            await run_ingestion_cycle(pool)
        except Exception as e:
            log.error(f"Ingestion cycle error: {e}", exc_info=True)
        await asyncio.sleep(config.satx.watch_interval)


async def main():
    parser = argparse.ArgumentParser(description="GDI SATx Ingestion Pipeline")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--watch", action="store_true", help="Watch mode (daemon)")
    parser.add_argument("--init-station", action="store_true",
                        help="Create default station from config")
    args = parser.parse_args()

    if not args.once and not args.watch and not args.init_station:
        parser.print_help()
        sys.exit(1)

    # Connect to database
    log.info(f"Connecting to {config.db.host}:{config.db.port}/{config.db.name}")
    pool = await asyncpg.create_pool(config.db.dsn, min_size=1, max_size=4)

    try:
        if args.init_station:
            async with pool.acquire() as conn:
                await conn.execute(
                    """INSERT INTO stations (name, latitude, longitude, elevation, status)
                       VALUES ($1, $2, $3, $4, 'online')
                       ON CONFLICT (name) DO UPDATE SET
                           latitude = EXCLUDED.latitude,
                           longitude = EXCLUDED.longitude,
                           elevation = EXCLUDED.elevation,
                           status = 'online'""",
                    config.station_name, config.station_lat,
                    config.station_lon, config.station_elev,
                )
                log.info(f"Station '{config.station_name}' initialized at "
                         f"({config.station_lat}, {config.station_lon})")

        if args.once:
            await run_ingestion_cycle(pool)
        elif args.watch:
            await watch_mode(pool)
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
