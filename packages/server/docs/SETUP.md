# 🚀 Digital Asset Management – Monorepo Setup & Operations Guide

This guide explains how to configure, run, and operate the DAM monorepo (server, workers, and infra) from scratch to production-like.

## 📦 Stack & Architecture
- Runtime: Node.js 18+, TypeScript
- API: Express (clean layering: routes → middlewares → controllers → services → dao → models)
- DB: MongoDB (external cluster)
- Object Storage: MinIO (S3-compatible) via AWS SDK v3
- Queues: BullMQ + Redis
- Media: Sharp (images), FFmpeg/ffprobe (videos)
- Orchestration: Docker + Docker Compose
- Monorepo: Yarn workspaces

## 📁 Monorepo Layout (key parts)
```
digital-asset-management/
├─ docker-compose.yml
├─ .env                     # Root env used by all Docker services
├─ packages/
│  ├─ server/
│  │  ├─ src/               # API, services, dao, models, workers
│  │  ├─ DockerFile.dev     # API server image
│  │  └─ Dockerfile.worker  # Workers image
│  └─ client/               
└─ ...
```

## ✅ Prerequisites
- Node.js 18+
- Yarn
- Docker & Docker Compose
- External MongoDB (update MONGO_URI accordingly)

## 🔧 Environment Configuration

Create a root `.env` at the repository root (docker-compose reads this for all services):

```env
# Application
NODE_ENV=development
APP_NAME="Digital Asset Management"
PORT=4000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster-host>/
MONGO_DB=digital_assets_db
MONGOOSE_DEBUG=true

# JWT / Auth
JWT_SECRET=development-jwt-secret-change-in-production
ACCESS_TOKEN_EXPIRY=86400
ISSUER=dam.api
AUDIENCE=dam.users

# Redis (container network)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispassword123
REDIS_DB=0
REDIS_KEY_PREFIX=dam:

# Object Storage (S3/MinIO)
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin123
S3_BUCKET_NAME=dam-assets
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
SKIP_STORAGE_HEAD=true

# MinIO Server envs
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_DEFAULT_BUCKETS=dam-assets

# Workers / Processing
WORKER_CONCURRENCY=5
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
VIDEO_PROCESSING_PRESET=fast
ENABLE_HEALTH_CHECK=false
HEALTH_CHECK_PORT=3002
LOG_WORKER_STATUS=false
MAX_FILE_SIZE_BYTES=5368709120

# Docs / Support
LOG_LEVEL=debug
CONTACT_EMAIL=you@example.com
GITHUB_REPO_URL=https://github.com/your-org/your-repo

# Tests
API_BASE_URL=http://localhost:4000
```

Notes:
- docker-compose.yml uses `env_file: ./.env` for all services; no duplicate hardcoded variables.
- For local dev (running API without Docker), you can optionally create `packages/server/.env` with the same values.

## 📥 Install Dependencies (Monorepo)
```bash
yarn install
```

## ▶️ Run – Full Docker Stack
```bash
# Build images and start everything (Redis, MinIO, API server, workers, dashboard)
docker compose up -d --build

# Tail logs
docker compose logs -f | cat
```

### Services & URLs
| Service | URL | Notes |
|--------|-----|-------|
| API Server | http://localhost:4000 | Health: `/health`, Base: `/api/v1` |
| MinIO Console | http://localhost:9001 | Login with MINIO_ROOT_USER/PASSWORD |
| BullMQ Dashboard | http://localhost:3001 | Queue monitoring |
| Redis | localhost:6379 | Password: REDIS_PASSWORD |

### Default Credentials
- MinIO: `minioadmin` / `minioadmin123`
- Redis: Password `redispassword123`

## 🧪 E2E Tests (Server)
```bash
cd packages/server
yarn test "asset.routes" --verbose --detectOpenHandles
```
Notes:
- In tests, MinIO PUT from host may return 403 due to network isolation; tests treat this as expected and continue using `SKIP_STORAGE_HEAD=true`.

## 🧑‍💻 Hybrid Dev (Docker infra, local API)
```bash
# Start infra only
docker compose up -d redis minio minio-client bullmq-dashboard

# In another terminal: run API locally
cd packages/server
yarn dev         # API server
yarn worker      # Background workers
```
Make sure your local `.env` points `REDIS_HOST=localhost` and `S3_ENDPOINT=http://localhost:9000` when running API outside Docker.

## 🔄 Scaling Workers
```bash
# Scale background workers based on load
docker compose up -d --scale worker=3
```

## 📈 Typical Workflow (Manual)
1. POST `/api/v1/assets/uploads` → get `assetId` + presigned `uploadUrl`
2. PUT file → `uploadUrl` (hosted by MinIO)
3. POST `/api/v1/assets/:id/finalize` with checksum and size
4. Workers pick up processing jobs (metadata, thumbnails, transcode)
5. GET `/api/v1/assets/:id` → observe status and renditions/metadata
6. GET `/api/v1/assets/:id/download` → presigned download URL (when completed)

## 🧰 Troubleshooting
- MinIO upload returns 403 in tests:
  - Expected in host-based tests due to Docker DNS; we use `S3_PUBLIC_ENDPOINT` to rewrite presigned hostnames and `SKIP_STORAGE_HEAD=true` to bypass headObject.
- Asset stays `processing`:
  - Ensure workers are running and connected to Redis; check BullMQ dashboard at http://localhost:3001.
- Mongo connection errors:
  - Verify `MONGO_URI` is correct and accessible. Check cluster IP whitelisting.
- CORS errors during client calls:
  - Add your client origin to `CORS_ORIGIN` (comma-separated).

## 🧭 Monorepo Commands Cheat Sheet
```bash
# Install
yarn install

# Build server (TS)
yarn workspace server build

# Run dev server / workers locally
yarn workspace server dev
yarn workspace server worker

# Docker stack
docker compose up -d --build
docker compose down -v
```
