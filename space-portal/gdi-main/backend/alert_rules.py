"""
GDI Default Alert Rules
========================
Pre-configured threshold and geofence rules for the alerting engine.
Loaded on server startup. Can be modified at runtime via API.

Classification: CONFIDENTIAL — Artifact Virtual Internal
"""

import logging
from alerting import (
    alert_engine,
    AlertType, Severity, GeofenceTrigger,
    ThresholdRule, GeofenceRegion, GeofenceWatch,
)

log = logging.getLogger("gdi.alert_rules")


def load_default_rules():
    """Load the default rule set into the alerting engine."""

    # ═══════════════════════════════════════════════════════════
    #  SEISMIC THRESHOLDS
    # ═══════════════════════════════════════════════════════════

    alert_engine.add_threshold_rule(ThresholdRule(
        id="seismic-m50-critical",
        name="Significant Earthquake (M5.0+)",
        layer="seismic",
        field="magnitude",
        operator=">=",
        value=5.0,
        severity=Severity.CRITICAL,
        title_template="Earthquake M{value}: {entity}",
        message_template="Magnitude {value} earthquake detected — {entity}",
        cooldown_seconds=120.0,
    ))

    alert_engine.add_threshold_rule(ThresholdRule(
        id="seismic-m60-emergency",
        name="Major Earthquake (M6.0+)",
        layer="seismic",
        field="magnitude",
        operator=">=",
        value=6.0,
        severity=Severity.EMERGENCY,
        title_template="MAJOR EARTHQUAKE M{value}: {entity}",
        message_template="EMERGENCY — Major earthquake magnitude {value} at {entity}. Assess for tsunami risk.",
        cooldown_seconds=60.0,
    ))

    alert_engine.add_threshold_rule(ThresholdRule(
        id="seismic-tsunami-warning",
        name="Tsunami Flag Detected",
        layer="seismic",
        field="tsunami",
        operator=">=",
        value=1.0,
        severity=Severity.EMERGENCY,
        title_template="TSUNAMI WARNING: {entity}",
        message_template="USGS tsunami flag set for event at {entity}. Magnitude {value}.",
        cooldown_seconds=300.0,
    ))

    # ═══════════════════════════════════════════════════════════
    #  FLIGHT THRESHOLDS
    # ═══════════════════════════════════════════════════════════

    # Military aircraft category detection (OpenSky category 6 = "Heavy" military)
    # Note: OpenSky category field is limited. Category 0 = no info, higher = specific types.
    # We flag high-value targets by altitude patterns instead.
    alert_engine.add_threshold_rule(ThresholdRule(
        id="flight-low-altitude-warning",
        name="Extremely Low Altitude Flight",
        layer="flights",
        field="altitude",
        operator="<=",
        value=150.0,  # meters — below 500ft, possibly military NOE flight
        severity=Severity.WARNING,
        title_template="Low Altitude Contact: {entity}",
        message_template="Aircraft {entity} at {value}m altitude — possible NOE/military profile",
        cooldown_seconds=300.0,
    ))

    alert_engine.add_threshold_rule(ThresholdRule(
        id="flight-high-vertical-rate",
        name="Rapid Descent Detected",
        layer="flights",
        field="vertical_rate",
        operator="<=",
        value=-30.0,  # m/s — rapid descent (about -6000 fpm)
        severity=Severity.CRITICAL,
        title_template="Rapid Descent: {entity}",
        message_template="Aircraft {entity} descending at {value} m/s — possible emergency",
        cooldown_seconds=120.0,
    ))

    alert_engine.add_threshold_rule(ThresholdRule(
        id="flight-transponder-off",
        name="Transponder Ground Signal in Air",
        layer="flights",
        field="on_ground",
        operator="==",
        value=1.0,  # on_ground=True but if altitude > 0 — anomaly handled separately
        severity=Severity.INFO,
        title_template="Ground Signal: {entity}",
        message_template="Aircraft {entity} reporting ground status — possible transponder issue",
        cooldown_seconds=600.0,
    ))

    # ═══════════════════════════════════════════════════════════
    #  SATELLITE THRESHOLDS (placeholder — evaluated when sat data flows)
    # ═══════════════════════════════════════════════════════════

    alert_engine.add_threshold_rule(ThresholdRule(
        id="sat-low-perigee",
        name="Satellite Low Perigee (Decay Risk)",
        layer="satellites",
        field="perigee_km",
        operator="<=",
        value=200.0,  # km — below this, drag becomes significant
        severity=Severity.INFO,
        title_template="Satellite Decay Risk: {entity}",
        message_template="Satellite {entity} perigee at {value}km — orbital decay possible",
        cooldown_seconds=3600.0,
    ))

    # ═══════════════════════════════════════════════════════════
    #  EXAMPLE GEOFENCE: Key Strategic Regions
    #  (Users can add more at runtime via API)
    # ═══════════════════════════════════════════════════════════

    # Taiwan Strait — high-value monitoring zone
    alert_engine.add_region(GeofenceRegion(
        id="taiwan-strait",
        name="Taiwan Strait",
        polygon=[
            [26.0, 118.0],
            [26.0, 121.0],
            [22.0, 121.0],
            [22.0, 118.0],
        ],
    ))

    alert_engine.add_watch(GeofenceWatch(
        id="watch-taiwan-mil-enter",
        region_id="taiwan-strait",
        entity_type="flight",
        trigger=GeofenceTrigger.ENTER,
        severity=Severity.INFO,
        title_template="Aircraft {trigger} {region}",
        message_template="Aircraft {entity} has {trigger} the {region} monitoring zone",
    ))

    # Strait of Hormuz — oil chokepoint
    alert_engine.add_region(GeofenceRegion(
        id="hormuz-strait",
        name="Strait of Hormuz",
        center_lat=26.5,
        center_lon=56.3,
        radius_km=100.0,
    ))

    alert_engine.add_watch(GeofenceWatch(
        id="watch-hormuz-enter",
        region_id="hormuz-strait",
        entity_type="flight",
        trigger=GeofenceTrigger.ENTER,
        severity=Severity.INFO,
        title_template="Aircraft {trigger} {region}",
        message_template="Aircraft {entity} has {trigger} the {region} monitoring zone",
    ))

    # ═══════════════════════════════════════════════════════════

    rules_count = len(alert_engine.get_rules())
    regions_count = len(alert_engine.get_regions())
    log.info(f"Default alert rules loaded: {rules_count} threshold rules, {regions_count} geofence regions")

    return {
        "threshold_rules": rules_count,
        "regions": regions_count,
        "watches": len([w for w in alert_engine._watches.values()]),
    }
