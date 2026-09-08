-- GDI Valkyrie Database Initialization
-- Run: sudo -u postgres psql -f /home/adam/workspace/enterprise/projects/gdi/backend/init-db.sql

-- Create database and user
CREATE DATABASE gdi_satx;
CREATE USER gdi WITH PASSWORD 'gdi_secret';
GRANT ALL PRIVILEGES ON DATABASE gdi_satx TO gdi;

\c gdi_satx

CREATE EXTENSION IF NOT EXISTS postgis;
GRANT ALL ON SCHEMA public TO gdi;

-- Stations table
CREATE TABLE stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION DEFAULT 0,
    status VARCHAR(20) DEFAULT 'offline',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satellites table
CREATE TABLE satellites (
    id SERIAL PRIMARY KEY,
    norad_id INTEGER UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    tle_line1 VARCHAR(100),
    tle_line2 VARCHAR(100),
    category VARCHAR(50) DEFAULT 'unknown',
    intl_designator VARCHAR(20),
    epoch TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_satellites_category ON satellites(category);

-- Passes table
CREATE TABLE passes (
    id SERIAL PRIMARY KEY,
    satellite_id INTEGER REFERENCES satellites(id),
    station_id INTEGER REFERENCES stations(id),
    aos_time TIMESTAMPTZ NOT NULL,
    los_time TIMESTAMPTZ NOT NULL,
    max_elevation DOUBLE PRECISION,
    aos_azimuth DOUBLE PRECISION,
    los_azimuth DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'predicted',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(satellite_id, aos_time)
);
CREATE INDEX idx_passes_time ON passes(aos_time, los_time);

-- Recordings table
CREATE TABLE recordings (
    id SERIAL PRIMARY KEY,
    pass_id INTEGER REFERENCES passes(id),
    station_id INTEGER REFERENCES stations(id),
    file_path VARCHAR(500),
    file_size BIGINT,
    sample_rate INTEGER,
    center_frequency DOUBLE PRECISION,
    bandwidth DOUBLE PRECISION,
    duration DOUBLE PRECISION,
    format VARCHAR(20) DEFAULT 'raw_iq',
    gain_db DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detections table
CREATE TABLE detections (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER REFERENCES recordings(id),
    satellite_id INTEGER REFERENCES satellites(id),
    frequency_hz DOUBLE PRECISION NOT NULL,
    frequency_offset DOUBLE PRECISION,
    snr_db DOUBLE PRECISION NOT NULL,
    peak_time TIMESTAMPTZ NOT NULL,
    duration_ms DOUBLE PRECISION,
    confidence DOUBLE PRECISION DEFAULT 0,
    signal_class VARCHAR(50) DEFAULT 'unknown',
    modulation_type VARCHAR(50),
    protocol VARCHAR(100),
    bandwidth_hz DOUBLE PRECISION,
    ground_lat DOUBLE PRECISION,
    ground_lon DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_detections_time ON detections(peak_time);
CREATE INDEX idx_detections_freq ON detections(frequency_hz);
CREATE INDEX idx_detections_class ON detections(signal_class);

-- Alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    detection_id INTEGER REFERENCES detections(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    ack_by VARCHAR(100),
    ack_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_unack ON alerts(acknowledged) WHERE NOT acknowledged;

-- Flight history table
CREATE TABLE flight_history (
    id SERIAL PRIMARY KEY,
    icao24 VARCHAR(10) NOT NULL,
    callsign VARCHAR(20),
    country VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    velocity DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    vertical_rate DOUBLE PRECISION,
    squawk VARCHAR(10),
    category INTEGER,
    on_ground BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_flight_history_icao ON flight_history(icao24);
CREATE INDEX idx_flight_history_time ON flight_history(timestamp);
CREATE INDEX idx_flight_history_callsign ON flight_history(callsign);

-- Seismic events table
CREATE TABLE seismic_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(50) UNIQUE NOT NULL,
    magnitude DOUBLE PRECISION,
    depth DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    place TEXT,
    event_time TIMESTAMPTZ,
    felt INTEGER,
    tsunami BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_seismic_time ON seismic_events(event_time);
CREATE INDEX idx_seismic_mag ON seismic_events(magnitude);

-- Initialize default station
INSERT INTO stations (name, latitude, longitude, elevation, status)
VALUES ('GDI-PRIMARY', 33.6844, 73.0479, 508.0, 'online');
