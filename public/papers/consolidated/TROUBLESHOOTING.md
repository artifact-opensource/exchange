# Troubleshooting Guide

This guide helps you diagnose and fix common issues with the Research Project.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Runtime Issues](#runtime-issues)
- [Development Issues](#development-issues)
- [Docker Issues](#docker-issues)
- [Testing Issues](#testing-issues)
- [CI/CD Issues](#ci-cd-issues)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

## Quick Diagnostics

### Run System Check

```bash
# Check all requirements
make check

# View system status
python -c "import sys; print(f'Python: {sys.version}')"
node --version
docker --version
git --version
```

### Check Service Status

```bash
# API health
curl http://localhost:5000/health

# Docker services
docker ps
make docker-logs

# Frontend
curl http://localhost:3000
```

## Installation Issues

### Problem: `make setup` Fails

**Symptoms:**
- Command exits with errors
- Dependencies fail to install
- Permission errors

**Solutions:**

1. **Check Python version:**
```bash
python --version  # Must be 3.8+
```

2. **Check Node.js version:**
```bash
node --version  # Must be 18+
```

3. **Fix permissions:**
```bash
sudo chown -R $USER:$USER .
chmod -R u+w .
```

4. **Use virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows
make install-dev
```

### Problem: `pip install` Fails

**Symptoms:**
- Package installation errors
- Compilation errors
- Network errors

**Solutions:**

1. **Upgrade pip:**
```bash
pip install --upgrade pip setuptools wheel
```

2. **Install system dependencies (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install python3-dev build-essential
```

3. **Install system dependencies (macOS):**
```bash
brew install python@3.11
```

4. **Use --user flag if needed:**
```bash
pip install --user -r requirements.txt
```

### Problem: `npm install` Fails

**Symptoms:**
- Node modules installation errors
- gyp errors
- Permission errors

**Solutions:**

1. **Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

2. **Use correct Node version:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

3. **Fix permissions (global packages):**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

## Runtime Issues

### Problem: Port Already in Use

**Symptoms:**
- "Address already in use" error
- Cannot start server

**Solutions:**

1. **Find process using port:**
```bash
# Linux/macOS
lsof -i :5000  # API port
lsof -i :3000  # Frontend port

# Windows
netstat -ano | findstr :5000
```

2. **Kill process:**
```bash
# Linux/macOS
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

3. **Use different port:**
```bash
API_PORT=5001 python api.py
PORT=3001 npm run dev
```

### Problem: Import Errors

**Symptoms:**
- "ModuleNotFoundError"
- "No module named 'xyz'"

**Solutions:**

1. **Install missing dependencies:**
```bash
pip install -r setup/requirements.txt
pip install -r head_1/system/requirements.txt
```

2. **Set PYTHONPATH:**
```bash
export PYTHONPATH=/home/runner/work/research/research:$PYTHONPATH
```

3. **Check virtual environment:**
```bash
which python  # Should point to venv
source venv/bin/activate
```

### Problem: Database/File Not Found

**Symptoms:**
- "FileNotFoundError"
- Cannot read/write database

**Solutions:**

1. **Create directories:**
```bash
mkdir -p _cnu/data
mkdir -p logs
```

2. **Check permissions:**
```bash
ls -la _cnu/data
chmod 755 _cnu/data
```

3. **Initialize database:**
```bash
python -c "from _cnu.hybrid_serverless_db import init_db; init_db.main()"
```

### Problem: API Returns 500 Errors

**Symptoms:**
- Internal server errors
- Stack traces in logs

**Solutions:**

1. **Check logs:**
```bash
tail -f logs/app.log
python api.py  # Run in debug mode
```

2. **Verify configuration:**
```bash
cat .env
# Check all required variables are set
```

3. **Check framework initialization:**
```bash
python -c "from inference_api.config import Config; print(Config().to_dict())"
```

## Development Issues

### Problem: Pre-commit Hooks Fail

**Symptoms:**
- Commit blocked by pre-commit
- Linting/formatting errors

**Solutions:**

1. **Run formatters manually:**
```bash
make format
```

2. **Fix linting errors:**
```bash
make lint
# Read errors and fix them
```

3. **Skip hooks (not recommended):**
```bash
git commit --no-verify
```

4. **Update hooks:**
```bash
pre-commit autoupdate
pre-commit install --install-hooks
```

### Problem: Type Checking Errors (mypy)

**Symptoms:**
- mypy reports type errors
- Incompatible types

**Solutions:**

1. **Add type hints:**
```python
def process_data(input_data: dict[str, Any]) -> dict[str, Any]:
    pass
```

2. **Use type: ignore for third-party:**
```python
import external_lib  # type: ignore
```

3. **Update mypy config in pyproject.toml:**
```toml
[tool.mypy]
ignore_missing_imports = true
```

### Problem: Linting Errors (ruff)

**Symptoms:**
- Ruff reports style violations
- Import ordering issues

**Solutions:**

1. **Auto-fix with ruff:**
```bash
ruff check --fix .
ruff format .
```

2. **Ignore specific rules:**
```python
# ruff: noqa: E501  # Line too long
```

## Docker Issues

### Problem: Docker Won't Start

**Symptoms:**
- "Cannot connect to Docker daemon"
- Docker commands fail

**Solutions:**

1. **Start Docker daemon:**
```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker

# macOS
# Start Docker Desktop

# Windows
# Start Docker Desktop
```

2. **Add user to docker group (Linux):**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### Problem: Container Build Fails

**Symptoms:**
- Docker build errors
- Image build fails

**Solutions:**

1. **Clean Docker cache:**
```bash
docker system prune -a
```

2. **Build without cache:**
```bash
docker-compose build --no-cache
```

3. **Check Dockerfile syntax:**
```bash
docker build -t test .
```

### Problem: Container Won't Start

**Symptoms:**
- Container exits immediately
- Health check fails

**Solutions:**

1. **Check logs:**
```bash
docker logs <container-name>
docker-compose logs -f
```

2. **Inspect container:**
```bash
docker inspect <container-name>
```

3. **Run interactively:**
```bash
docker run -it <image-name> /bin/bash
```

### Problem: Can't Access Container Services

**Symptoms:**
- Cannot connect to Prometheus/Grafana
- Port not accessible

**Solutions:**

1. **Check port mapping:**
```bash
docker ps
# Verify ports are correctly mapped
```

2. **Check firewall:**
```bash
sudo ufw status
sudo ufw allow 9090  # Prometheus
sudo ufw allow 3000  # Grafana
```

3. **Use host network:**
```yaml
# docker-compose.yml
network_mode: "host"
```

## Testing Issues

### Problem: Tests Fail to Run

**Symptoms:**
- pytest/jest won't start
- No tests discovered

**Solutions:**

1. **Check test configuration:**
```bash
# Python
pytest --collect-only

# JavaScript
npm test -- --listTests
```

2. **Install test dependencies:**
```bash
pip install pytest pytest-cov
npm install --save-dev jest @testing-library/react
```

3. **Verify test file naming:**
```bash
# Must match patterns:
# test_*.py or *_test.py
# *.test.ts or *.spec.ts
```

### Problem: Test Coverage Too Low

**Symptoms:**
- Coverage below threshold
- Build fails on coverage check

**Solutions:**

1. **Run with coverage report:**
```bash
pytest --cov --cov-report=html
# Open htmlcov/index.html
```

2. **Identify uncovered code:**
```bash
pytest --cov --cov-report=term-missing
```

3. **Adjust threshold temporarily:**
```ini
# pytest.ini
[pytest]
addopts = --cov-fail-under=40
```

### Problem: Specific Test Fails

**Symptoms:**
- One or more tests failing
- Inconsistent test results

**Solutions:**

1. **Run specific test:**
```bash
pytest tests/test_specific.py::test_function -v
```

2. **Run with verbose output:**
```bash
pytest -vv -s
```

3. **Debug with pdb:**
```python
import pdb; pdb.set_trace()
```

## CI/CD Issues

### Problem: GitHub Actions Failing

**Symptoms:**
- CI pipeline fails
- Workflow errors

**Solutions:**

1. **Check workflow logs:**
- Go to GitHub Actions tab
- Click on failed workflow
- Read error messages

2. **Run CI checks locally:**
```bash
make ci
```

3. **Common fixes:**
```bash
# Fix linting
make lint
make format

# Fix tests
make test

# Fix security
make security
```

### Problem: Security Scan Failures

**Symptoms:**
- Bandit/Safety reports vulnerabilities
- CodeQL alerts

**Solutions:**

1. **Review security report:**
```bash
bandit -r . -f json -o bandit-report.json
cat bandit-report.json
```

2. **Update vulnerable dependencies:**
```bash
pip install --upgrade package-name
npm update package-name
```

3. **Suppress false positives:**
```python
# nosec
import subprocess
subprocess.run(["ls", "-la"])  # nosec B603
```

## Performance Issues

### Problem: Slow Application

**Symptoms:**
- High response times
- Timeouts

**Solutions:**

1. **Check resource usage:**
```bash
htop
docker stats
```

2. **Enable caching:**
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_function():
    pass
```

3. **Profile code:**
```python
import cProfile
cProfile.run('main()')
```

### Problem: High Memory Usage

**Symptoms:**
- Out of memory errors
- Container killed

**Solutions:**

1. **Increase Docker memory:**
```yaml
# docker-compose.yml
services:
  api:
    mem_limit: 2g
```

2. **Optimize code:**
```python
# Use generators instead of lists
def process_large_data():
    for item in data:
        yield process(item)
```

3. **Monitor memory:**
```python
import psutil
print(psutil.virtual_memory())
```

## Getting Help

### Before Asking for Help

1. **Search existing issues:**
   - [GitHub Issues](https://github.com/amuzetnoM/research/issues)

2. **Check documentation:**
   - README.md
   - QUICKSTART.md
   - CONTRIBUTING.md
   - API_DOCUMENTATION.md

3. **Run diagnostics:**
```bash
make check
make test
docker-compose logs
```

### Creating an Issue

Use the appropriate issue template:
- [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)
- [Documentation](.github/ISSUE_TEMPLATE/documentation.md)

Include:
- **Environment:** OS, Python version, Node version
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Logs and errors**
- **Screenshots** (if applicable)

### Community Resources

- **GitHub Discussions:** For questions and discussions
- **GitHub Issues:** For bugs and feature requests
- **Security Issues:** See [SECURITY.md](SECURITY.md)

---

**Still stuck?** Create a [GitHub Issue](https://github.com/amuzetnoM/research/issues/new/choose) with all relevant details.
