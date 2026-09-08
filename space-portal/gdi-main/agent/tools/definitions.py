"""
VALKYRIE Tool Definitions — GDI-specific tools for the AI analyst agent.

These extend Plug's base tools with geospatial intelligence capabilities.
The GDI backend executes these via its REST API.
"""

# GDI Backend base URL (local)
GDI_API_BASE = "http://localhost:8600/api"

VALKYRIE_TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "fly_to",
            "description": (
                "Navigate the GDI map camera to a location. "
                "Accepts place names (resolved via geocoding) or direct coordinates. "
                "Can set altitude, heading, pitch for 3D views."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Place name (e.g., 'Baghdad', 'JFK Airport') or 'lat,lon' coordinates.",
                    },
                    "altitude": {
                        "type": "number",
                        "description": "Camera altitude in meters. Default: auto-calculated from location type.",
                    },
                    "heading": {
                        "type": "number",
                        "description": "Camera heading in degrees (0=North). Default: 0.",
                    },
                    "pitch": {
                        "type": "number",
                        "description": "Camera pitch in degrees (-90=top-down, 0=horizon). Default: -90.",
                    },
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_layer",
            "description": (
                "Toggle a data layer on/off on the GDI map. "
                "Available layers: flights, seismic, satellites, cctv, traffic, satx."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "layer": {
                        "type": "string",
                        "enum": ["flights", "seismic", "satellites", "cctv", "traffic", "satx"],
                        "description": "The data layer to toggle.",
                    },
                    "enabled": {
                        "type": "boolean",
                        "description": "True to enable, False to disable. If omitted, toggles current state.",
                    },
                },
                "required": ["layer"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_filter",
            "description": (
                "Apply a visual post-processing filter to the map. "
                "Modes: NORMAL (default), CRT (retro monitor), NVG (night vision), FLIR (thermal)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["NORMAL", "CRT", "NVG", "FLIR"],
                        "description": "The visual filter mode to apply.",
                    },
                },
                "required": ["mode"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_flights",
            "description": (
                "Query live flight data. Can filter by region (bounding box), "
                "callsign, airline, aircraft type, altitude range, or proximity to a point."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Region name or bounding box 'lat1,lon1,lat2,lon2'.",
                    },
                    "callsign": {
                        "type": "string",
                        "description": "Filter by callsign (supports wildcards: 'PIA*').",
                    },
                    "airline": {
                        "type": "string",
                        "description": "Filter by airline ICAO code (e.g., 'PIA', 'UAE', 'BAW').",
                    },
                    "aircraft_type": {
                        "type": "string",
                        "description": "Filter by aircraft type (e.g., 'B77W', 'A320').",
                    },
                    "min_altitude": {
                        "type": "number",
                        "description": "Minimum altitude in feet.",
                    },
                    "max_altitude": {
                        "type": "number",
                        "description": "Maximum altitude in feet.",
                    },
                    "near": {
                        "type": "string",
                        "description": "Location name or 'lat,lon' — find flights near this point.",
                    },
                    "radius_km": {
                        "type": "number",
                        "description": "Radius in km when using 'near'. Default: 100.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_seismic",
            "description": (
                "Query earthquake/seismic data. Filter by region, magnitude range, "
                "time range, or depth."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Region name or bounding box.",
                    },
                    "min_magnitude": {
                        "type": "number",
                        "description": "Minimum magnitude.",
                    },
                    "max_magnitude": {
                        "type": "number",
                        "description": "Maximum magnitude.",
                    },
                    "hours": {
                        "type": "number",
                        "description": "Look back N hours. Default: 24.",
                    },
                    "min_depth": {
                        "type": "number",
                        "description": "Minimum depth in km.",
                    },
                    "max_depth": {
                        "type": "number",
                        "description": "Maximum depth in km.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_satellites",
            "description": (
                "Query tracked satellite data. Filter by name, NORAD ID, "
                "orbit type, or visibility from a location."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Satellite name or partial match (e.g., 'ISS', 'STARLINK').",
                    },
                    "norad_id": {
                        "type": "string",
                        "description": "NORAD catalog ID.",
                    },
                    "orbit_type": {
                        "type": "string",
                        "enum": ["LEO", "MEO", "GEO", "HEO"],
                        "description": "Filter by orbit type.",
                    },
                    "visible_from": {
                        "type": "string",
                        "description": "Location name or 'lat,lon' — show satellites visible from here.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_region",
            "description": (
                "Perform multi-source intelligence analysis on a geographic region. "
                "Correlates flight, seismic, satellite, and CCTV data to produce "
                "a situational awareness briefing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {
                        "type": "string",
                        "description": "Region name or bounding box to analyze.",
                    },
                    "focus": {
                        "type": "string",
                        "enum": ["all", "flights", "seismic", "military", "anomalies"],
                        "description": "Analysis focus area. Default: all.",
                    },
                    "hours": {
                        "type": "number",
                        "description": "Analysis time window in hours. Default: 24.",
                    },
                },
                "required": ["region"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "capture_view",
            "description": "Capture a screenshot of the current GDI map view. Returns the image path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "label": {
                        "type": "string",
                        "description": "Optional label for the capture (used in filename).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "valkyrie_remember",
            "description": (
                "Store a piece of knowledge in VALKYRIE's local memory. "
                "Use for saving locations, user preferences, analysis results, "
                "or any information worth persisting across sessions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {
                        "type": "string",
                        "description": "A descriptive key (e.g., 'user_home_location', 'last_analysis_target').",
                    },
                    "value": {
                        "type": "string",
                        "description": "The information to remember.",
                    },
                    "category": {
                        "type": "string",
                        "description": "Category: 'location', 'preference', 'analysis', 'general'. Default: 'general'.",
                    },
                },
                "required": ["key", "value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "valkyrie_recall",
            "description": (
                "Search VALKYRIE's local memory for relevant information. "
                "Uses keyword search over stored conversations and knowledge."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query.",
                    },
                    "k": {
                        "type": "integer",
                        "description": "Number of results. Default: 5.",
                    },
                },
                "required": ["query"],
            },
        },
    },
]
