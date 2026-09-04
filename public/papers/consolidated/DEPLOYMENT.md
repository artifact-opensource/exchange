# Deployment Guide

This guide covers deploying the Research Project to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployments](#cloud-deployments)
- [Environment Configuration](#environment-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 10 GB
- OS: Ubuntu 20.04+, macOS 11+, Windows 10+

**Recommended:**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 20+ GB
- GPU: Optional, for AI model training

### Software Requirements

- Python 3.8+
- Node.js 18+
- Docker 20.10+ and Docker Compose 2.0+ (for containerized deployment)
- Git

## Local Development

See [QUICKSTART.md](QUICKSTART.md) for detailed local development setup.

Quick start:
```bash
git clone https://github.com/amuzetnoM/research.git
cd research
make setup
make dev-frontend  # Terminal 1
make dev-api       # Terminal 2
```

## Docker Deployment

### Building Images

Build all Docker images:
```bash
cd head_1/monitoring
docker-compose build
```

### Running Services

Start all services:
```bash
make docker-up
```

Or manually:
```bash
cd head_1/monitoring
docker-compose up -d
```

### Accessing Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Node Exporter**: http://localhost:9100
- **cAdvisor**: http://localhost:8080

### Stopping Services

```bash
make docker-down
```

## Production Deployment

### Environment Setup

1. **Create production environment file:**
```bash
cp .env.example .env.production
```

2. **Edit `.env.production`:**
```bash
# API Configuration
API_PORT=5000
API_DEBUG=False
API_HOST=0.0.0.0

# Security
USE_SSL=True
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
API_SECRET_KEY=<generate-strong-secret>

# Database
CNU_DB_PATH=/var/lib/research/db.json
CNU_REGISTRY_PATH=/var/lib/research/registry.json

# Monitoring
PROMETHEUS_RETENTION_TIME=30d
```

### Python API Deployment

#### Using systemd (Ubuntu/Debian)

1. **Create systemd service file:**
```bash
sudo nano /etc/systemd/system/research-api.service
```

2. **Add configuration:**
```ini
[Unit]
Description=Research AI API Server
After=network.target

[Service]
Type=simple
User=research
WorkingDirectory=/opt/research
Environment="PATH=/opt/research/venv/bin"
EnvironmentFile=/opt/research/.env.production
ExecStart=/opt/research/venv/bin/python api.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. **Enable and start:**
```bash
sudo systemctl enable research-api
sudo systemctl start research-api
sudo systemctl status research-api
```

#### Using Gunicorn (Production WSGI)

1. **Install Gunicorn:**
```bash
pip install gunicorn
```

2. **Create Gunicorn config:**
```python
# gunicorn.conf.py
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
errorlog = "/var/log/research/gunicorn-error.log"
accesslog = "/var/log/research/gunicorn-access.log"
loglevel = "info"
```

3. **Run with Gunicorn:**
```bash
gunicorn -c gunicorn.conf.py api:app
```

### Frontend Deployment

#### Building for Production

```bash
cd frontend
npm run build
npm run start
```

#### Using PM2

1. **Install PM2:**
```bash
npm install -g pm2
```

2. **Create PM2 config:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'research-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/opt/research',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

3. **Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

1. **Install Nginx:**
```bash
sudo apt install nginx
```

2. **Create Nginx config:**
```nginx
# /etc/nginx/sites-available/research
server {
    listen 80;
    server_name research.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name research.example.com;

    ssl_certificate /etc/ssl/certs/research.crt;
    ssl_certificate_key /etc/ssl/private/research.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Monitoring (restrict access)
    location /prometheus {
        auth_basic "Restricted";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://localhost:9090;
    }
    
    location /grafana {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

3. **Enable and reload:**
```bash
sudo ln -s /etc/nginx/sites-available/research /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Cloud Deployments

### AWS Deployment

#### EC2 Instance

1. **Launch EC2 instance** (Ubuntu 22.04, t3.medium or larger)

2. **Configure security groups:**
   - Allow inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Allow outbound: All

3. **SSH into instance:**
```bash
ssh -i your-key.pem ubuntu@<instance-ip>
```

4. **Install dependencies and deploy:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.10 python3-pip nodejs npm docker.io docker-compose nginx
git clone https://github.com/amuzetnoM/research.git
cd research
make setup
# Configure environment and start services
```

#### ECS (Elastic Container Service)

1. **Create ECR repositories:**
```bash
aws ecr create-repository --repository-name research-api
aws ecr create-repository --repository-name research-frontend
```

2. **Build and push Docker images:**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t research-api .
docker tag research-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/research-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/research-api:latest
```

3. **Create ECS task definitions and services** (use AWS Console or CLI)

### Google Cloud Platform

#### App Engine

1. **Create `app.yaml`:**
```yaml
runtime: python39
instance_class: F2

env_variables:
  API_PORT: "8080"
  
automatic_scaling:
  min_instances: 1
  max_instances: 10
```

2. **Deploy:**
```bash
gcloud app deploy
```

#### Google Kubernetes Engine (GKE)

See Kubernetes section below.

### Heroku

1. **Create `Procfile`:**
```
web: gunicorn api:app
```

2. **Create `runtime.txt`:**
```
python-3.11.0
```

3. **Deploy:**
```bash
heroku create research-app
git push heroku main
heroku open
```

### Kubernetes

1. **Create deployment manifests:**
```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: research-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: research-api
  template:
    metadata:
      labels:
        app: research-api
    spec:
      containers:
      - name: api
        image: research-api:latest
        ports:
        - containerPort: 5000
        env:
        - name: API_PORT
          value: "5000"
```

2. **Apply manifests:**
```bash
kubectl apply -f k8s/
```

## Environment Configuration

### Critical Environment Variables

```bash
# Required
API_SECRET_KEY=<generate-strong-secret>
API_TOKEN=<generate-api-token>

# Database
CNU_DB_PATH=/path/to/db.json
CNU_REGISTRY_PATH=/path/to/registry.json

# Optional but recommended
USE_SSL=True
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

### Generating Secrets

```python
import secrets
print(secrets.token_urlsafe(32))  # API_SECRET_KEY
print(secrets.token_urlsafe(64))  # API_TOKEN
```

## Monitoring Setup

### Prometheus

1. **Configure Prometheus targets** in `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:5000']
  
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

2. **Start Prometheus:**
```bash
make docker-up
```

### Grafana

1. **Access Grafana**: http://localhost:3000
2. **Login**: admin/admin (change on first login)
3. **Add Prometheus data source**
4. **Import dashboards** from `head_1/monitoring/grafana_dashboard/`

### Alerting

Configure alerts in Prometheus or Grafana for:
- High CPU/memory usage
- API errors
- Service downtime
- Security events

## Security Considerations

### SSL/TLS Certificates

**Let's Encrypt (Free):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d research.example.com
```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Hardening

1. **Disable root login** (SSH)
2. **Use SSH keys** instead of passwords
3. **Enable automatic security updates**
4. **Run services as non-root user**
5. **Implement rate limiting**
6. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault)

### Backup Strategy

```bash
# Backup database
tar -czf backup-$(date +%Y%m%d).tar.gz /var/lib/research/

# Automated backups with cron
0 2 * * * /opt/research/scripts/backup.sh
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

**Permission denied:**
```bash
sudo chown -R $USER:$USER /opt/research
chmod +x scripts/*.sh
```

**Service won't start:**
```bash
# Check logs
sudo journalctl -u research-api -f
tail -f /var/log/research/*.log
```

**Database errors:**
```bash
# Check permissions
ls -la /var/lib/research/
# Restore from backup if needed
```

### Health Checks

```bash
# API health
curl http://localhost:5000/health

# Check all services
make docker-logs

# System resources
htop
df -h
free -h
```

### Getting Help

- GitHub Issues: [github.com/amuzetnoM/research/issues](https://github.com/amuzetnoM/research/issues)
- Documentation: See [docs/](docs/) directory
- Security issues: See [SECURITY.md](SECURITY.md)

## Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
make update-deps

# Rebuild and restart
make build
sudo systemctl restart research-api
pm2 restart research-frontend
```

### Monitoring

- Check logs daily
- Review metrics weekly
- Update dependencies monthly
- Security audits quarterly

---

For local development, see [QUICKSTART.md](QUICKSTART.md).  
For security concerns, see [SECURITY.md](SECURITY.md).  
For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
