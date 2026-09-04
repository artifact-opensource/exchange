# API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Configuration Management](#configuration-management)
  - [Self-Awareness API](#self-awareness-api)
  - [USIF API](#usif-api)
  - [PUP API](#pup-api)
- [Response Formats](#response-formats)
- [Webhooks](#webhooks)
- [SDKs and Client Libraries](#sdks-and-client-libraries)

## Overview

This document provides comprehensive documentation for the Research Project API. The API provides access to various AI frameworks including Self-Awareness, Unified Self-Improvement Framework (USIF), and Probabilistic Uncertainty Principle (PUP).

**API Version:** 1.0.0

**Last Updated:** 2024-12-25

## Authentication

The API uses token-based authentication. Include your API token in the request headers:

```http
Authorization: Bearer YOUR_API_TOKEN
```

### Getting an API Token

To obtain an API token, contact the project administrators.

### Token Security

- Keep your API tokens secure
- Do not share tokens in public repositories
- Rotate tokens regularly
- Use environment variables to store tokens

## Base URL

### Production
```
https://api.research.example.com
```

### Development
```
http://localhost:5000
```

## Rate Limiting

API requests are rate-limited to ensure service quality:

- **Default Limits:** 200 requests per day, 50 requests per hour
- **Configuration Endpoint:** 10 requests per minute

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "status": "error",
  "message": "Rate limit exceeded",
  "retry_after": 3600
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_TOKEN` | Authentication token is invalid |
| `MISSING_PARAMETER` | Required parameter is missing |
| `INVALID_INPUT` | Input validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |

## API Endpoints

### Health Check

Check the API health status.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Rate Limit:** Exempt

**Response:**

```json
{
  "status": "ok",
  "message": "API is healthy."
}
```

**Example:**

```bash
curl -X GET http://localhost:5000/health
```

---

### Configuration Management

Manage API configuration (Admin only).

#### Get Configuration

**Endpoint:** `GET /config`

**Authentication:** Required (Admin role)

**Rate Limit:** 10 per minute

**Response:**

```json
{
  "status": "ok",
  "config": {
    "ENABLE_SELF_AWARENESS": true,
    "ENABLE_USIF": true,
    "ENABLE_PUP": true,
    "USE_SSL": false
  }
}
```

#### Update Configuration

**Endpoint:** `POST /config`

**Authentication:** Required (Admin role)

**Rate Limit:** 10 per minute

**Request Body:**

```json
{
  "ENABLE_SELF_AWARENESS": true,
  "ENABLE_USIF": false,
  "ENABLE_PUP": true
}
```

**Response:**

```json
{
  "status": "ok",
  "message": "Configuration updated successfully."
}
```

**Example:**

```bash
curl -X POST http://localhost:5000/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ENABLE_SELF_AWARENESS": true}'
```

---

### Self-Awareness API

Access self-awareness framework capabilities.

**Base Path:** `/self_awareness`

**Authentication:** Required

#### Get Self-Awareness State

**Endpoint:** `GET /self_awareness/state`

**Response:**

```json
{
  "status": "ok",
  "state": {
    "epistemic_awareness": 0.85,
    "temporal_awareness": 0.72,
    "social_awareness": 0.68,
    "capabilities": ["reasoning", "learning", "adaptation"],
    "timestamp": "2024-12-25T12:00:00Z"
  }
}
```

#### Update Self-Awareness State

**Endpoint:** `POST /self_awareness/state`

**Request Body:**

```json
{
  "action": "reflect",
  "context": {
    "task": "problem_solving",
    "difficulty": "high"
  }
}
```

**Response:**

```json
{
  "status": "ok",
  "message": "Self-awareness state updated",
  "new_state": {
    "epistemic_awareness": 0.87,
    "temporal_awareness": 0.74,
    "social_awareness": 0.68
  }
}
```

---

### USIF API

Access Unified Self-Improvement Framework capabilities.

**Base Path:** `/usif`

**Authentication:** Required

#### Get Performance Metrics

**Endpoint:** `GET /usif/metrics`

**Response:**

```json
{
  "status": "ok",
  "metrics": {
    "accuracy": 0.92,
    "precision": 0.89,
    "recall": 0.91,
    "f1_score": 0.90,
    "improvement_rate": 0.037
  }
}
```

#### Trigger Self-Improvement

**Endpoint:** `POST /usif/improve`

**Request Body:**

```json
{
  "target_metric": "accuracy",
  "target_value": 0.95,
  "max_iterations": 100
}
```

**Response:**

```json
{
  "status": "ok",
  "message": "Self-improvement process initiated",
  "job_id": "usif_job_12345"
}
```

---

### PUP API

Access Probabilistic Uncertainty Principle capabilities.

**Base Path:** `/pup`

**Authentication:** Required

#### Get Uncertainty Estimate

**Endpoint:** `POST /pup/uncertainty`

**Request Body:**

```json
{
  "input": {
    "features": [1.2, 3.4, 5.6, 7.8]
  },
  "model_id": "model_v1"
}
```

**Response:**

```json
{
  "status": "ok",
  "prediction": 0.85,
  "uncertainty": {
    "epistemic": 0.12,
    "aleatoric": 0.08,
    "total": 0.14
  },
  "confidence_interval": {
    "lower": 0.71,
    "upper": 0.99
  }
}
```

---

## Response Formats

### Success Response

```json
{
  "status": "ok",
  "message": "Operation successful",
  "data": {}
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Webhooks

Configure webhooks to receive real-time updates about important events.

### Webhook Events

- `model.improved` - Triggered when USIF improves a model
- `awareness.updated` - Triggered when self-awareness state changes
- `uncertainty.high` - Triggered when uncertainty exceeds threshold

### Webhook Payload

```json
{
  "event": "model.improved",
  "timestamp": "2024-12-25T12:00:00Z",
  "data": {
    "model_id": "model_v1",
    "metric": "accuracy",
    "old_value": 0.92,
    "new_value": 0.95
  }
}
```

## SDKs and Client Libraries

### Python Client

```python
from research_api import ResearchClient

client = ResearchClient(api_token="YOUR_TOKEN")

# Get self-awareness state
state = client.self_awareness.get_state()
print(state.epistemic_awareness)

# Trigger self-improvement
job = client.usif.improve(target_metric="accuracy", target_value=0.95)
print(job.job_id)
```

### JavaScript Client

```javascript
import { ResearchClient } from '@research/api-client';

const client = new ResearchClient({ apiToken: 'YOUR_TOKEN' });

// Get self-awareness state
const state = await client.selfAwareness.getState();
console.log(state.epistemicAwareness);

// Trigger self-improvement
const job = await client.usif.improve({
  targetMetric: 'accuracy',
  targetValue: 0.95
});
console.log(job.jobId);
```

## Best Practices

1. **Cache responses** when appropriate to reduce API calls
2. **Handle rate limits** gracefully with exponential backoff
3. **Validate inputs** before sending requests
4. **Monitor API usage** to stay within limits
5. **Use webhooks** for real-time updates instead of polling
6. **Keep tokens secure** and rotate regularly
7. **Handle errors** appropriately with retry logic
8. **Use semantic versioning** for API compatibility

## Support

For API support:

- GitHub Issues: [github.com/amuzetnoM/research/issues](https://github.com/amuzetnoM/research/issues)
- Documentation: [docs.research.example.com](https://docs.research.example.com)
- Email: support@research.example.com

## Changelog

### v1.0.0 (2024-12-25)

- Initial API release
- Self-Awareness API endpoints
- USIF API endpoints
- PUP API endpoints
- Health check and configuration management
