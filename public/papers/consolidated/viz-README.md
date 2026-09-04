# GLADIUS Instrumentation Service

**Neural Terrain** — Real-time visualization of GLADIUS transformer internals.

🌎 **Live:** [gladius-viz.pages.dev](https://gladius-viz.pages.dev/)

## Architecture

```
projects/gladius-viz/
├── base.py                  # InstrumentBase ABC, HLG/Dolby color system
├── service.py               # Reader, Registry, Snapshot, Exporter, Daemon, CLI
├── gladius-terrain.html     # Canonical viewer (Three.js, auto-refresh, timeline)
├── deploy.sh                # One-command Cloudflare Pages deploy
├── instruments/             # Drop-in plugins (auto-discovered)
│   ├── embedding_landscape  # 3D terrain of token embedding norms
│   ├── layer_towers         # Q/K/V/O + FFN norm towers per layer
│   ├── svd_spectrum         # Singular value decomposition across layers
│   ├── attention_weights    # Raw weight heatmaps
│   ├── final_norm           # Final LayerNorm distribution
│   ├── alpha_router         # SLA² hybrid attention coefficients
│   ├── token_norms          # L2 norm distribution per layer
│   ├── depth_gate           # MoDA depth gate values (auto-detects)
│   └── weight_stats         # Health: std, kurtosis, sparsity
├── snapshots/               # Static PNG output
└── static/                  # JSON for viewer (latest.json, history.json, step_*.json)
```

## Usage

```bash
PYTHON="/home/adam/workspace/.hektor-env/bin/python3"

# Quick commands
$PYTHON service.py list                           # Show instruments
$PYTHON service.py metrics <checkpoint.pt>        # Print all metrics
$PYTHON service.py snapshot <checkpoint.pt>       # Render PNG composite
$PYTHON service.py export <checkpoint.pt>         # Export JSON for viewer

# Live monitoring during training
$PYTHON service.py live <training_dir>            # Watch + HTTP server (port 8471)
$PYTHON service.py watch <training_dir>           # Watch only (no HTTP)
$PYTHON service.py serve --port 8471              # HTTP server only

# Deploy to Cloudflare Pages
bash deploy.sh                                    # Deploy current data
bash deploy.sh <checkpoint.pt>                    # Export + deploy
```

## Viewer Features

- **LIVE/IDLE badge** — auto-detects active training (data freshness < 5min)
- **Auto-polling** — 15s during training, 2min when idle, change detection
- **Timeline** — navigate checkpoint history (arrow keys or click)
- **9 instruments** — switch between visualization modes
- **Metrics panel** — per-instrument scalar metrics
- **Dolby HLG** — HDR-grade color mapping for neural weight visualization

## Adding Instruments

Create `instruments/my_instrument.py`:

```python
from base import InstrumentBase, InstrumentResult, CheckpointMeta

class MyInstrument(InstrumentBase):
    name = "my_instrument"
    version = "1.0"
    description = "What it measures"
    required_patterns = ["*.weight"]  # Glob patterns for required tensor keys
    
    def extract(self, state_dict, meta):
        # Extract data from state dict
        data = ...
        return InstrumentResult(
            name=self.name, version=self.version,
            metrics={"some_metric": 42.0},
            arrays={"terrain": data.tolist()},  # 2D array for terrain view
        )
```

Drop it in `instruments/` — it auto-registers on next run.

## Deployment

Hosted on **Cloudflare Pages** (`gladius-viz.pages.dev`).
Credentials in vault: `cloudflare/PAGES_API_TOKEN`.

Old Vercel app (`gladius-three.vercel.app`) needs to be deleted — requires Vercel dashboard access.
