-- ═══════════════════════════════════════════════════════════════════
--  GDI — SATx Backend Schema
--  PostgreSQL + PostGIS
--
--  Tables: stations, satellites, passes, recordings, detections, alerts
--  Requires: CREATE EXTENSION postgis;
-- ═══════════════════════════════════════════════════════════════════

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ── Stations ────────────────────────────────────────────────────────
-- Ground stations running SATx receivers

CREATE TABLE IF NOT EXISTS stations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL UNIQUE,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    elevation       DOUBLE PRECISION DEFAULT 0,          -- meters ASL
    geom            GEOMETRY(POINT, 4326),                -- PostGIS point
    equipment       JSONB DEFAULT '{}',                   -- antenna, SDR, LNA info
    status          VARCHAR(24) DEFAULT 'offline'
                        CHECK (status IN ('online', 'offline', 'maintenance', 'recording')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stations_geom ON stations USING GIST(geom);
CREATE INDEX idx_stations_status ON stations(status);

-- Auto-populate geom from lat/lon
CREATE OR REPLACE FUNCTION stations_geom_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stations_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON stations
    FOR EACH ROW EXECUTE FUNCTION stations_geom_trigger();


-- ── Satellites ──────────────────────────────────────────────────────
-- Tracked satellites with TLE data

CREATE TABLE IF NOT EXISTS satellites (
    id              SERIAL PRIMARY KEY,
    norad_id        INTEGER NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    tle_line1       VARCHAR(72) NOT NULL,
    tle_line2       VARCHAR(72) NOT NULL,
    category        VARCHAR(48) DEFAULT 'unknown'
                        CHECK (category IN (
                            'amateur', 'weather', 'comms', 'navigation',
                            'military', 'science', 'debris', 'unknown'
                        )),
    intl_designator VARCHAR(16),
    epoch           TIMESTAMPTZ,                          -- TLE epoch
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    metadata        JSONB DEFAULT '{}'                    -- extra fields (rcs, country, etc.)
);

CREATE INDEX idx_satellites_norad ON satellites(norad_id);
CREATE INDEX idx_satellites_category ON satellites(category);
CREATE INDEX idx_satellites_updated ON satellites(last_updated);


-- ── Passes ──────────────────────────────────────────────────────────
-- Predicted or observed satellite passes over a station

CREATE TABLE IF NOT EXISTS passes (
    id              SERIAL PRIMARY KEY,
    satellite_id    INTEGER NOT NULL REFERENCES satellites(id) ON DELETE CASCADE,
    station_id      INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    aos_time        TIMESTAMPTZ NOT NULL,                 -- Acquisition of Signal
    los_time        TIMESTAMPTZ NOT NULL,                 -- Loss of Signal
    max_elevation   DOUBLE PRECISION,                     -- degrees above horizon
    aos_azimuth     DOUBLE PRECISION,                     -- degrees from north at AOS
    los_azimuth     DOUBLE PRECISION,                     -- degrees from north at LOS
    status          VARCHAR(24) DEFAULT 'predicted'
                        CHECK (status IN ('predicted', 'scheduled', 'recording', 'completed', 'missed')),
    priority        INTEGER DEFAULT 0,                    -- higher = more important
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_passes_satellite ON passes(satellite_id);
CREATE INDEX idx_passes_station ON passes(station_id);
CREATE INDEX idx_passes_aos ON passes(aos_time);
CREATE INDEX idx_passes_los ON passes(los_time);
CREATE INDEX idx_passes_status ON passes(status);
CREATE INDEX idx_passes_time_range ON passes(aos_time, los_time);

-- Constraint: LOS must be after AOS
ALTER TABLE passes ADD CONSTRAINT chk_pass_time CHECK (los_time > aos_time);


-- ── Recordings ──────────────────────────────────────────────────────
-- IQ recordings or audio captures from passes

CREATE TABLE IF NOT EXISTS recordings (
    id              SERIAL PRIMARY KEY,
    pass_id         INTEGER REFERENCES passes(id) ON DELETE SET NULL,
    station_id      INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    file_path       TEXT NOT NULL,
    file_size       BIGINT,                               -- bytes
    sample_rate     INTEGER NOT NULL,                     -- Hz
    center_frequency DOUBLE PRECISION NOT NULL,           -- Hz
    bandwidth       DOUBLE PRECISION,                     -- Hz
    duration        DOUBLE PRECISION,                     -- seconds
    format          VARCHAR(24) DEFAULT 'raw_iq'
                        CHECK (format IN ('raw_iq', 'wav', 'sigmf', 'cf32', 'cs16')),
    gain_db         DOUBLE PRECISION,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recordings_pass ON recordings(pass_id);
CREATE INDEX idx_recordings_station ON recordings(station_id);
CREATE INDEX idx_recordings_freq ON recordings(center_frequency);
CREATE INDEX idx_recordings_created ON recordings(created_at);


-- ── Detections ──────────────────────────────────────────────────────
-- Signal detections from analysis of recordings

CREATE TABLE IF NOT EXISTS detections (
    id              SERIAL PRIMARY KEY,
    recording_id    INTEGER REFERENCES recordings(id) ON DELETE SET NULL,
    satellite_id    INTEGER REFERENCES satellites(id) ON DELETE SET NULL,
    frequency_hz    DOUBLE PRECISION NOT NULL,            -- absolute frequency
    frequency_offset DOUBLE PRECISION,                    -- offset from center
    snr_db          DOUBLE PRECISION NOT NULL,
    peak_time       TIMESTAMPTZ NOT NULL,
    duration_ms     DOUBLE PRECISION,                     -- signal duration
    confidence      DOUBLE PRECISION DEFAULT 0
                        CHECK (confidence >= 0 AND confidence <= 1),
    signal_class    VARCHAR(48) DEFAULT 'unknown'
                        CHECK (signal_class IN (
                            'beacon', 'telemetry', 'voice', 'data', 'cw',
                            'burst', 'spread_spectrum', 'interference', 'unknown'
                        )),
    modulation_type VARCHAR(48),                          -- FM, AM, BPSK, QPSK, etc.
    protocol        VARCHAR(64),                          -- AX.25, CCSDS, proprietary, etc.
    bandwidth_hz    DOUBLE PRECISION,
    geom            GEOMETRY(POINT, 4326),                -- ground track position at detection time
    ground_lat      DOUBLE PRECISION,
    ground_lon      DOUBLE PRECISION,
    metadata        JSONB DEFAULT '{}',                   -- spectral data, waterfall thumb path, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_detections_recording ON detections(recording_id);
CREATE INDEX idx_detections_satellite ON detections(satellite_id);
CREATE INDEX idx_detections_freq ON detections(frequency_hz);
CREATE INDEX idx_detections_snr ON detections(snr_db);
CREATE INDEX idx_detections_peak ON detections(peak_time);
CREATE INDEX idx_detections_class ON detections(signal_class);
CREATE INDEX idx_detections_confidence ON detections(confidence);
CREATE INDEX idx_detections_geom ON detections USING GIST(geom);
CREATE INDEX idx_detections_created ON detections(created_at);

-- Auto-populate geom from ground lat/lon
CREATE OR REPLACE FUNCTION detections_geom_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ground_lat IS NOT NULL AND NEW.ground_lon IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.ground_lon, NEW.ground_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detections_geom
    BEFORE INSERT OR UPDATE OF ground_lat, ground_lon ON detections
    FOR EACH ROW EXECUTE FUNCTION detections_geom_trigger();


-- ── Alerts ──────────────────────────────────────────────────────────
-- Alerts triggered by detections or system events

CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    detection_id    INTEGER REFERENCES detections(id) ON DELETE SET NULL,
    station_id      INTEGER REFERENCES stations(id) ON DELETE SET NULL,
    alert_type      VARCHAR(48) NOT NULL
                        CHECK (alert_type IN (
                            'high_snr', 'new_signal', 'anomaly', 'frequency_drift',
                            'unauthorized', 'station_offline', 'pass_missed', 'system'
                        )),
    severity        VARCHAR(16) DEFAULT 'info'
                        CHECK (severity IN ('info', 'warning', 'critical')),
    title           VARCHAR(256) NOT NULL,
    message         TEXT,
    acknowledged    BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(128),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_detection ON alerts(detection_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_ack ON alerts(acknowledged);
CREATE INDEX idx_alerts_created ON alerts(created_at);
CREATE INDEX idx_alerts_unack ON alerts(acknowledged, created_at) WHERE NOT acknowledged;


-- ── Views ───────────────────────────────────────────────────────────

-- Active passes (currently in progress)
CREATE OR REPLACE VIEW v_active_passes AS
    SELECT p.*, s.name AS satellite_name, s.norad_id, st.name AS station_name
    FROM passes p
    JOIN satellites s ON p.satellite_id = s.id
    LEFT JOIN stations st ON p.station_id = st.id
    WHERE p.aos_time <= NOW() AND p.los_time >= NOW();

-- Recent detections with satellite and recording info
CREATE OR REPLACE VIEW v_recent_detections AS
    SELECT d.*, s.name AS satellite_name, s.norad_id,
           r.center_frequency AS recording_freq, r.file_path,
           st.name AS station_name
    FROM detections d
    LEFT JOIN satellites s ON d.satellite_id = s.id
    LEFT JOIN recordings r ON d.recording_id = r.id
    LEFT JOIN passes p ON r.pass_id = p.id
    LEFT JOIN stations st ON p.station_id = st.id
    ORDER BY d.created_at DESC;

-- Unacknowledged alerts
CREATE OR REPLACE VIEW v_active_alerts AS
    SELECT a.*, d.frequency_hz, d.snr_db, d.signal_class,
           s.name AS satellite_name
    FROM alerts a
    LEFT JOIN detections d ON a.detection_id = d.id
    LEFT JOIN satellites s ON d.satellite_id = s.id
    WHERE NOT a.acknowledged
    ORDER BY
        CASE a.severity
            WHEN 'critical' THEN 0
            WHEN 'warning' THEN 1
            ELSE 2
        END,
        a.created_at DESC;

-- Dashboard statistics
CREATE OR REPLACE VIEW v_dashboard_stats AS
    SELECT
        (SELECT COUNT(*) FROM satellites) AS total_satellites,
        (SELECT COUNT(*) FROM stations WHERE status = 'online') AS active_stations,
        (SELECT COUNT(*) FROM passes WHERE aos_time <= NOW() AND los_time >= NOW()) AS active_passes,
        (SELECT COUNT(*) FROM passes WHERE aos_time >= NOW() AND aos_time <= NOW() + INTERVAL '24 hours') AS upcoming_passes_24h,
        (SELECT COUNT(*) FROM detections WHERE created_at >= NOW() - INTERVAL '24 hours') AS detections_24h,
        (SELECT COUNT(*) FROM detections WHERE created_at >= NOW() - INTERVAL '1 hour') AS detections_1h,
        (SELECT COUNT(*) FROM recordings) AS total_recordings,
        (SELECT COALESCE(SUM(file_size), 0) FROM recordings) AS total_recording_bytes,
        (SELECT COUNT(*) FROM alerts WHERE NOT acknowledged) AS unacknowledged_alerts,
        (SELECT COUNT(*) FROM alerts WHERE NOT acknowledged AND severity = 'critical') AS critical_alerts;
