# Digital Asset Management - Server

The backend API for the Digital Asset Management (DAM) platform. Built with Node.js, Express, TypeScript, and MongoDB, providing a robust, scalable API for asset management with background processing capabilities.

## 🎯 Overview

This Express.js application serves as the backend for the DAM platform, handling:
- User authentication and authorization
- Asset upload and management
- Background processing with BullMQ
- Project and organization management
- File storage integration
- Analytics and reporting

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety and better development experience
- **MongoDB + Mongoose** - Document database and ODM
- **BullMQ + Redis** - Job queue for background processing
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **Zod** - Schema validation
- **Winston** - Logging framework
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+
- Redis 6+
- Yarn package manager

### Development Setup

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

   Configure your environment variables:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/dam-dev
   REDIS_URL=redis://localhost:6379

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h

   # Storage
   STORAGE_PROVIDER=minio
   MINIO_ENDPOINT=localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET_NAME=dam-assets

   # Server
   PORT=3000
   NODE_ENV=development
   ```

3. **Start Development Server**
   ```bash
   yarn dev
   ```

4. **Access the API**
   - API Base URL: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs (if implemented)

## 📁 Project Structure

```
src/
├── controllers/         # Route controllers
│   ├── auth.ts         # Authentication endpoints
│   ├── assets.ts       # Asset management endpoints
│   ├── projects.ts     # Project management endpoints
│   ├── organizations.ts # Organization management
│   └── analytics.ts    # Analytics endpoints
├── models/             # Mongoose models and schemas
│   ├── Organization.ts # Organization model
│   ├── User.ts         # User model
│   ├── Project.ts      # Project model
│   ├── Asset.ts        # Asset model
│   ├── Job.ts          # Processing job model
│   └── ShareLink.ts    # Share link model
├── routes/             # API route definitions
│   ├── v1/             # API version 1 routes
│   │   ├── auth.ts     # Authentication routes
│   │   ├── assets.ts   # Asset routes
│   │   ├── projects.ts # Project routes
│   │   └── index.ts    # Route aggregator
│   └── index.ts        # Main router
├── services/           # Business logic layer
│   ├── auth.ts         # Authentication service
│   ├── assets.ts       # Asset processing service
│   ├── storage.ts      # File storage service
│   ├── queue.ts        # Job queue service
│   └── analytics.ts    # Analytics service
├── workers/            # BullMQ job processors
│   ├── assetProcessor.ts # Asset processing worker
│   ├── thumbnailGenerator.ts # Thumbnail generation
│   ├── videoTranscoder.ts # Video transcoding
│   └── metadataExtractor.ts # Metadata extraction
├── middleware/         # Express middleware
│   ├── auth.ts         # Authentication middleware
│   ├── validation.ts   # Request validation middleware
│   ├── error.ts        # Error handling middleware
│   ├── rateLimit.ts    # Rate limiting middleware
│   └── cors.ts         # CORS configuration
├── types/              # TypeScript type definitions
│   ├── api.ts          # API request/response types
│   ├── models.ts       # Database model types
│   ├── common.ts       # Common types and interfaces
│   └── bullmq.ts       # BullMQ-related types
├── utils/              # Utility functions
│   ├── validation.ts   # Validation schemas with Zod
│   ├── logger.ts       # Logging utility
│   ├── crypto.ts       # Cryptographic utilities
│   └── format.ts       # Data formatting functions
├── config/             # Configuration files
│   ├── database.ts     # Database configuration
│   ├── redis.ts        # Redis configuration
│   ├── storage.ts      # Storage configuration
│   └── index.ts        # Main configuration
└── app.ts              # Express app setup
```

## 🗄️ Database Schema

### Core Models

#### Organization
```typescript
interface Organization {
  _id: ObjectId;
  name: string;
  status: 'active' | 'suspended' | 'archived';
  ownerId: ObjectId; // User reference
  settings: {
    storageQuotaBytes: number; // Default: 500GB
    featureFlags: {
      enablePublicSharing: boolean;
      enableApiAccess: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### User
```typescript
interface User {
  _id: ObjectId;
  organizationId: ObjectId;
  roleId: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  status: 'invited' | 'active' | 'deactivated';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Asset
```typescript
interface Asset {
  _id: ObjectId;
  organizationId: ObjectId;
  projectId: ObjectId;
  uploadedBy: ObjectId;
  originalFilename: string;
  mimeType: string;
  assetType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'ARCHIVE' | 'OTHER';
  fileSizeBytes: number;
  checksum: string;
  status: 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  storageProvider: 'minio' | 's3' | 'gcs';
  storageKey: string;
  latestVersion: number;
  versions: AssetVersion[];
  tags: string[];
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    codec?: string;
    bitrate?: number;
    pageCount?: number;
  };
  customMetadata: Map<string, string>;
  renditions: {
    thumbnail_small?: Rendition;
    thumbnail_large?: Rendition;
    preview_720p?: Rendition;
  };
  access: 'private' | 'organization' | 'public';
  analytics: {
    viewCount: number;
    downloadCount: number;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Processing Job
```typescript
interface ProcessingJob {
  _id: ObjectId;
  bullJobId: string;
  assetId: ObjectId;
  organizationId: ObjectId;
  jobName: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'retrying';
  workerId?: string;
  attempts: number;
  logs: JobLog[];
  error?: JobError;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Development Scripts

```bash
# Development
yarn dev              # Start with nodemon
yarn start            # Start production server
yarn build            # Build TypeScript to JavaScript

# Code Quality
yarn lint             # Run ESLint
yarn lint:fix         # Fix ESLint issues
yarn format           # Format code with Prettier
yarn format:check     # Check code formatting

# Database
yarn db:migrate       # Run database migrations (if any)
yarn db:seed          # Seed database with test data
```

## 🔐 Authentication & Authorization

### JWT Authentication
```typescript
// middleware/auth.ts
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### Role-Based Access Control
```typescript
// middleware/authorization.ts
export const authorize = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = await Role.findById(req.user.roleId);
    const hasPermission = requiredPermissions.every(permission =>
      userRole?.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/logout
```

### Assets
```
GET    /api/v1/assets
POST   /api/v1/assets/upload
GET    /api/v1/assets/:id
PUT    /api/v1/assets/:id
DELETE /api/v1/assets/:id
GET    /api/v1/assets/:id/download
GET    /api/v1/assets/:id/preview
```

### Projects
```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

### Organizations
```
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:id
PUT    /api/v1/organizations/:id
DELETE /api/v1/organizations/:id
```

## ⚙️ Background Processing

### BullMQ Job Queue
```typescript
// services/queue.ts
export class QueueService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('asset-processing', {
      connection: redisConfig
    });
  }

  async addAssetProcessingJob(assetId: string, operations: string[]) {
    await this.queue.add('process-asset', {
      assetId,
      operations
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  }
}
```

### Worker Implementation
```typescript
// workers/assetProcessor.ts
export class AssetProcessor {
  @process('process-asset')
  async processAsset(job: Job) {
    const { assetId, operations } = job.data;

    for (const operation of operations) {
      switch (operation) {
        case 'generate-thumbnails':
          await this.generateThumbnails(assetId);
          break;
        case 'extract-metadata':
          await this.extractMetadata(assetId);
          break;
        case 'transcode-video':
          await this.transcodeVideo(assetId);
          break;
      }
    }
  }
}
```

## 🗂️ File Storage

### Multi-Provider Support
```typescript
// services/storage.ts
export class StorageService {
  private provider: StorageProvider;

  constructor(providerType: StorageProvider) {
    switch (providerType) {
      case 'minio':
        this.provider = new MinIOProvider();
        break;
      case 's3':
        this.provider = new S3Provider();
        break;
      case 'gcs':
        this.provider = new GCSProvider();
        break;
    }
  }

  async uploadFile(file: Buffer, key: string, mimeType: string) {
    return this.provider.upload(file, key, mimeType);
  }

  async downloadFile(key: string) {
    return this.provider.download(key);
  }
}
```

## 📊 Analytics & Monitoring

### Request Logging
```typescript
// middleware/logger.ts
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  });

  next();
};
```

### Performance Monitoring
- Request/response times
- Database query performance
- Job queue metrics
- Storage usage tracking
- Error rate monitoring

## 🛡️ Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - API rate limiting
- **Input Validation** - Zod schema validation
- **CORS** - Cross-origin configuration
- **SQL Injection Protection** - Mongoose built-in protection
- **XSS Protection** - Content Security Policy
- **File Upload Security** - File type and size validation

## 🧪 Testing

```bash
# Unit tests
yarn test

# Integration tests
yarn test:integration

# Test coverage
yarn test:coverage

# E2E tests
yarn test:e2e
```

## 🚢 Deployment

### Build Process
```bash
yarn build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN yarn install --production
COPY dist/ ./
EXPOSE 3000
CMD ["node", "index.js"]
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb://production-db:27017/dam
REDIS_URL=redis://redis:6379
JWT_SECRET=your-production-jwt-secret
```

## 📈 Scaling Considerations

- **Horizontal Scaling**: Multiple server instances behind load balancer
- **Database Scaling**: MongoDB replica sets and sharding
- **Queue Scaling**: Multiple BullMQ workers
- **Storage Scaling**: CDN integration for asset delivery
- **Caching**: Redis caching for frequently accessed data

## 🐛 Error Handling

### Global Error Handler
```typescript
// middleware/error.ts
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error:', error);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
};
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com)
- [Mongoose Documentation](https://mongoosejs.com)
- [BullMQ Documentation](https://docs.bullmq.io)
- [MongoDB Documentation](https://docs.mongodb.com)
- [TypeScript Documentation](https://www.typescriptlang.org)

## 🤝 Contributing

1. Follow the established code patterns and architecture
2. Write comprehensive tests for new features
3. Update API documentation
4. Ensure proper error handling and logging
5. Follow the existing TypeScript patterns

## 📄 License

This project is part of the Digital Asset Management platform and follows the same license terms.
