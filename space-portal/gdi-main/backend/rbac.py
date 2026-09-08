"""
GDI — Role-Based Access Control (RBAC) Engine
PostgreSQL-backed user management with hierarchical roles, permissions, and audit.

Replaces .users.json with a proper auth system.
"""

import os
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from enum import IntEnum
from typing import Optional

log = logging.getLogger("gdi.rbac")


# ─── Role Hierarchy ─────────────────────────────────────────────
# Higher number = more privilege. Each role inherits all lower roles.

class Role(IntEnum):
    VIEWER     = 10   # Read-only access to globe and data
    ANALYST    = 20   # Can query, search, create annotations, use Valkyrie
    COMMANDER  = 30   # Can manage alerts, set geofences, acknowledge events
    ADMIN      = 40   # Can manage users, configure system, access audit logs
    SUPERADMIN = 50   # Full system access, can create admins


# ─── Permissions ─────────────────────────────────────────────────

ROLE_PERMISSIONS = {
    Role.VIEWER: {
        "view_globe", "view_flights", "view_seismic", "view_satellites",
        "view_alerts", "view_hud",
    },
    Role.ANALYST: {
        "use_valkyrie", "search_hektor", "query_correlation",
        "create_annotation", "export_data", "view_audit_own",
        "use_filters", "view_intelligence",
    },
    Role.COMMANDER: {
        "manage_alerts", "acknowledge_alerts", "create_geofence",
        "delete_geofence", "manage_layers", "generate_reports",
        "view_sigint", "manage_satx",
    },
    Role.ADMIN: {
        "manage_users", "view_audit_all", "configure_system",
        "manage_api_keys", "manage_workers", "restart_services",
    },
    Role.SUPERADMIN: {
        "create_admin", "delete_admin", "system_override",
        "access_raw_db", "manage_encryption",
    },
}


def get_permissions(role: Role) -> set:
    """Get all permissions for a role (including inherited from lower roles)."""
    perms = set()
    for r in Role:
        if r <= role:
            perms |= ROLE_PERMISSIONS.get(r, set())
    return perms


def has_permission(role: Role, permission: str) -> bool:
    """Check if a role has a specific permission."""
    return permission in get_permissions(role)


def role_from_string(s: str) -> Role:
    """Convert string to Role enum."""
    mapping = {
        "viewer": Role.VIEWER,
        "analyst": Role.ANALYST,
        "commander": Role.COMMANDER,
        "admin": Role.ADMIN,
        "superadmin": Role.SUPERADMIN,
    }
    return mapping.get(s.lower(), Role.VIEWER)


# ─── Password Hashing ───────────────────────────────────────────

def hash_password(password: str) -> str:
    """PBKDF2-SHA256 with random salt."""
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000)
    return f"{salt}${h.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Constant-time password verification."""
    try:
        salt, hash_hex = stored_hash.split("$", 1)
        h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000)
        return secrets.compare_digest(h.hex(), hash_hex)
    except Exception:
        return False


# ─── API Key Management ─────────────────────────────────────────

def generate_api_key() -> str:
    """Generate a secure API key (48 bytes, base64-urlsafe)."""
    return f"gdi_{secrets.token_urlsafe(48)}"


def hash_api_key(key: str) -> str:
    """Hash an API key for storage (SHA-256, no salt needed — key is already random)."""
    return hashlib.sha256(key.encode()).hexdigest()


# ─── PostgreSQL Schema ──────────────────────────────────────────

USERS_SCHEMA = """
-- GDI User Management (extends existing schema.sql)

CREATE TABLE IF NOT EXISTS gdi_users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(64) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(24) NOT NULL DEFAULT 'viewer'
                        CHECK (role IN ('viewer', 'analyst', 'commander', 'admin', 'superadmin')),
    display_name    VARCHAR(128),
    email           VARCHAR(256),
    active          BOOLEAN DEFAULT TRUE,
    mfa_secret      TEXT,                                  -- TOTP secret (encrypted)
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    last_login      TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdi_users_username ON gdi_users(username);
CREATE INDEX IF NOT EXISTS idx_gdi_users_role ON gdi_users(role);
CREATE INDEX IF NOT EXISTS idx_gdi_users_active ON gdi_users(active);

CREATE TABLE IF NOT EXISTS gdi_api_keys (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES gdi_users(id) ON DELETE CASCADE,
    key_hash        VARCHAR(64) NOT NULL UNIQUE,           -- SHA-256 of the API key
    name            VARCHAR(128) NOT NULL,                 -- Human-readable label
    permissions     JSONB DEFAULT '[]',                    -- Scoped permissions (subset of role)
    last_used       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdi_api_keys_hash ON gdi_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_gdi_api_keys_user ON gdi_api_keys(user_id);

CREATE TABLE IF NOT EXISTS gdi_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES gdi_users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,           -- SHA-256 of JWT
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_gdi_sessions_user ON gdi_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_gdi_sessions_token ON gdi_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_gdi_sessions_active ON gdi_sessions(revoked, expires_at);

CREATE TABLE IF NOT EXISTS gdi_audit_log (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES gdi_users(id) ON DELETE SET NULL,
    username        VARCHAR(64),
    action          VARCHAR(128) NOT NULL,
    resource        VARCHAR(256),                          -- What was accessed/modified
    details         JSONB DEFAULT '{}',
    ip_address      VARCHAR(45),
    severity        VARCHAR(16) DEFAULT 'info'
                        CHECK (severity IN ('info', 'warning', 'critical')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdi_audit_user ON gdi_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gdi_audit_action ON gdi_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_gdi_audit_created ON gdi_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_gdi_audit_severity ON gdi_audit_log(severity);

-- Auto-create default superadmin if no users exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM gdi_users) THEN
        INSERT INTO gdi_users (username, password_hash, role, display_name)
        VALUES ('admin', 'CHANGE_ON_FIRST_LOGIN', 'superadmin', 'System Administrator');
    END IF;
END $$;

-- Cleanup function: remove expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM gdi_sessions WHERE expires_at < NOW() OR revoked = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Geofence table for alerting
CREATE TABLE IF NOT EXISTS gdi_geofences (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    description     TEXT,
    geom            GEOMETRY(POLYGON, 4326) NOT NULL,      -- PostGIS polygon
    center_lat      DOUBLE PRECISION,
    center_lon      DOUBLE PRECISION,
    radius_km       DOUBLE PRECISION,                      -- For circle fences
    trigger_type    VARCHAR(24) DEFAULT 'enter'
                        CHECK (trigger_type IN ('enter', 'exit', 'dwell', 'both')),
    entity_filter   JSONB DEFAULT '{}',                    -- Which entity types to watch
    severity        VARCHAR(16) DEFAULT 'warning'
                        CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    active          BOOLEAN DEFAULT TRUE,
    created_by      INTEGER REFERENCES gdi_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdi_geofences_geom ON gdi_geofences USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_gdi_geofences_active ON gdi_geofences(active);
"""


# ─── User Store (in-memory fallback when PostgreSQL unavailable) ─

class InMemoryUserStore:
    """Fallback user store when PostgreSQL is not available."""

    def __init__(self, users_file: str):
        self.users_file = users_file
        self.users = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.users_file):
            import json
            with open(self.users_file) as f:
                return json.load(f)
        default = {
            "admin": {
                "password_hash": hash_password("valkyrie"),
                "role": "superadmin",
                "display_name": "System Administrator",
                "active": True,
                "created": datetime.now(timezone.utc).isoformat(),
            }
        }
        self._save(default)
        return default

    def _save(self, users: dict = None):
        import json
        with open(self.users_file, "w") as f:
            json.dump(users or self.users, f, indent=2)
        os.chmod(self.users_file, 0o600)

    def authenticate(self, username: str, password: str) -> Optional[dict]:
        user = self.users.get(username)
        if not user or not user.get("active", True):
            return None
        if verify_password(password, user["password_hash"]):
            return {"username": username, "role": user["role"], "display_name": user.get("display_name", username)}
        return None

    def create_user(self, username: str, password: str, role: str = "analyst", display_name: str = None) -> bool:
        if username in self.users:
            return False
        self.users[username] = {
            "password_hash": hash_password(password),
            "role": role,
            "display_name": display_name or username,
            "active": True,
            "created": datetime.now(timezone.utc).isoformat(),
        }
        self._save()
        return True

    def list_users(self) -> list:
        return [
            {"username": k, "role": v["role"], "display_name": v.get("display_name", k), "active": v.get("active", True)}
            for k, v in self.users.items()
        ]

    def update_role(self, username: str, new_role: str) -> bool:
        if username not in self.users:
            return False
        self.users[username]["role"] = new_role
        self._save()
        return True

    def deactivate_user(self, username: str) -> bool:
        if username not in self.users:
            return False
        self.users[username]["active"] = False
        self._save()
        return True


log.info("RBAC engine loaded — %d roles, %d permission sets", len(Role), sum(len(v) for v in ROLE_PERMISSIONS.values()))
