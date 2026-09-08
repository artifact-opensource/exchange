# ═══════════════════════════════════════════════════════════════════
#  GDI SATx Backend — Dockerfile
#  Python 3.12 + FastAPI + asyncpg + SGP4
# ═══════════════════════════════════════════════════════════════════

FROM python:3.12-slim

LABEL maintainer="Artifact Virtual <ava@artifactvirtual.com>"
LABEL description="GDI SATx Backend — Satellite tracking and signal intelligence API"

# System deps for asyncpg (PostgreSQL client libs)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/*

# Working directory
WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY config.py server.py ingest.py ./

# Create data directories
RUN mkdir -p /opt/satx/data/{tle,passes,recordings,candidates,spectrograms,logs}

# Expose API port
EXPOSE 8600

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8600/api/health'); r.raise_for_status()"

# Default: run the API server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8600"]
