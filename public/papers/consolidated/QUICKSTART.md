# Quick Start Guide

This guide will help you get started with the Research Project in under 10 minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **Docker** (optional, for monitoring) - [Download Docker](https://www.docker.com/)
- **Git** - [Download Git](https://git-scm.com/)

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/amuzetnoM/research.git
cd research
```

### 2. Automated Setup (Recommended)

Using Make (Linux/macOS):
```bash
make setup
```

This will:
- Install all Python dependencies
- Install all Node.js dependencies
- Set up pre-commit hooks
- Prepare your development environment

### 3. Manual Setup (Alternative)

If you don't have `make`:

**Install Python dependencies:**
```bash
pip install -r setup/requirements.txt
pip install -r head_1/system/requirements.txt
```

**Install Node.js dependencies:**
```bash
npm install
cd frontend && npm install
```

**Install development tools:**
```bash
pip install pytest pytest-cov ruff mypy bandit black pre-commit
pre-commit install
```

### 4. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and set your configuration values.

## Running the Project

### Start the API Server

```bash
# Using Make
make dev-api

# Or manually
python api.py
```

The API will be available at `http://localhost:5000`

### Start the Frontend

```bash
# Using Make
make dev-frontend

# Or manually
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Start Monitoring Services (Optional)

```bash
# Using Make
make docker-up

# Or manually
cd head_1/monitoring
docker-compose up -d
```

Access monitoring:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Testing

### Run All Tests

```bash
make test
```

### Run Python Tests Only

```bash
make test-python
```

### Run JavaScript Tests Only

```bash
make test-js
```

## Code Quality

### Run Linters

```bash
make lint
```

### Format Code

```bash
make format
```

### Security Checks

```bash
make security
```

## Project Structure

```
research/
├── head_1/              # Main AI frameworks and systems
│   ├── frameworks/      # AI frameworks (self-awareness, ethics, etc.)
│   ├── models/          # AI models
│   ├── monitoring/      # Monitoring and diagnostics
│   └── system/          # System utilities
├── frontend/            # Next.js frontend application
├── _cnu/               # Core neurological state manager
├── dataService/        # Data service abstraction layer
├── inference_api/      # Inference API
└── .github/            # GitHub workflows and configurations
```

## Key Features to Explore

### 1. Self-Awareness Framework

```python
from head_1.frameworks.self_awareness import SelfAwarenessSystem

system = SelfAwarenessSystem()
state = system.get_awareness_state()
print(f"Epistemic Awareness: {state.epistemic}")
```

### 2. COMPASS Ethics Framework

```python
from head_1.frameworks.ethics import COMPASS

compass = COMPASS()
decision = compass.evaluate_action(action_data)
print(f"Ethical Score: {decision.score}")
```

### 3. Probabilistic Uncertainty Principle

```python
from head_1.frameworks.probabalistic_uncertainty_principle import PUP

pup = PUP()
uncertainty = pup.estimate_uncertainty(input_data)
print(f"Uncertainty: {uncertainty.total}")
```

## Common Tasks

### View Available Commands

```bash
make help
```

### Clean Build Artifacts

```bash
make clean
```

### Update Dependencies

```bash
make update-deps
```

### Run CI Checks Locally

```bash
make ci
```

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

```bash
# Find and kill process on port 5000 (API)
lsof -ti:5000 | xargs kill -9

# Find and kill process on port 3000 (Frontend)
lsof -ti:3000 | xargs kill -9
```

### Import Errors

If you encounter import errors:

```bash
# Ensure you're in the project root
cd /path/to/research

# Reinstall dependencies
make install
```

### Docker Issues

If Docker services won't start:

```bash
# Rebuild Docker services
make docker-rebuild

# Or manually
cd head_1/monitoring
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Next Steps

- Read the [Contributing Guide](CONTRIBUTING.md)
- Explore the [API Documentation](API_DOCUMENTATION.md)
- Review the [Framework Documentation](head_1/docs/framework_documentation.md)
- Join our community discussions

## Getting Help

- **Documentation:** See `/docs` directory
- **Issues:** [GitHub Issues](https://github.com/amuzetnoM/research/issues)
- **Discussions:** [GitHub Discussions](https://github.com/amuzetnoM/research/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Ready to contribute?** Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
