# Digital Asset Management (DAM) Platform

A comprehensive, scalable digital asset management solution built with modern web technologies. This platform enables organizations to efficiently upload, process, organize, and share digital assets including images, videos, documents, and more.

## 🎯 Problem Statement

Companies today generate and manage large volumes of digital assets across multiple teams and projects. Most businesses lack a centralized solution to:
- Upload multiple large files efficiently
- Process assets in the background (thumbnails, compression, metadata extraction)
- Tag, categorize, and search assets based on content
- Allow teams to preview, download, and share assets securely
- Scale processing and storage as volume grows

## ✨ Features

### Core Functionality
- **Multi-file Upload**: Drag-and-drop or API-based file uploads
- **Asset Gallery**: Browse, search, and filter assets with advanced metadata
- **Background Processing**: Automatic thumbnail generation, video transcoding, metadata extraction
- **Asset Management**: Versioning, tagging, custom metadata, access controls
- **Secure Sharing**: Shareable links with permissions and expiration
- **Analytics**: Usage statistics and download tracking

### Admin Dashboard
- Asset browser with advanced filters
- Upload/download analytics
- System monitoring and job queues
- Organization management

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │   BullMQ       │
│   (Vite + TS)   │◄──►│  (Node.js + TS) │◄──►│   Workers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │  Tailwind   │    │   MongoDB       │    │    Redis       │
    │    CSS      │    │   (Assets DB)   │    │   (Queue)      │
    └─────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   MinIO/S3     │    │   Docker        │    │   Docker       │
    │  Object Store  │    │   Swarm         │    │   Compose      │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend (Client)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **Zod** - Schema validation
- **Lucide React** - Icon library

### Backend (Server)
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB + Mongoose** - Database and ODM
- **BullMQ + Redis** - Job queue and processing
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Zod** - Schema validation

### DevOps & Infrastructure
- **Docker + Docker Swarm** - Container orchestration
- **MinIO** - S3-compatible object storage
- **Redis** - Caching and job queues
- **Nginx** - Reverse proxy (optional)

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Nodemon** - Development auto-restart

## 📊 Database Schema

### Core Entities

#### 🏢 Organization
- Multi-tenant architecture
- Storage quotas and feature flags
- Status management (active, suspended, archived)

#### 👥 User & Role Management
- Organization-based user isolation
- Granular permissions system
- Role-based access control

#### 📂 Project Structure
- Hierarchical project organization
- Asset categorization and management

#### 🖼 Asset Management
- Version control and metadata
- Multiple renditions (thumbnails, previews)
- Background processing pipeline

#### ⚙ Processing Jobs
- BullMQ-based job queue
- Retry logic and error handling
- Worker scaling based on load

#### 🔗 Share Links
- Secure asset sharing
- Permission-based access
- Download tracking and limits

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn package manager
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd digital-asset-management
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   yarn install

   # Client dependencies
   cd packages/client && yarn install && cd ../..

   # Server dependencies
   cd packages/server && yarn install && cd ../..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment files
   cp packages/server/.env.example packages/server/.env
   cp packages/client/.env.example packages/client/.env
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Start client
   cd packages/client && yarn dev

   # Terminal 2: Start server
   cd packages/server && yarn dev

   # Terminal 3: Start Redis and MinIO (optional)
   docker-compose up -d redis minio
   ```

5. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - MinIO Console: http://localhost:9001
   - Redis Commander: http://localhost:8081

## 📁 Project Structure

```
digital-asset-management/
├── packages/
│   ├── client/              # React frontend
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── pages/       # Page components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── services/    # API services
│   │   │   ├── types/       # TypeScript definitions
│   │   │   └── utils/       # Utility functions
│   │   ├── public/          # Static assets
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/              # Express backend
│       ├── src/
│       │   ├── controllers/ # Route controllers
│       │   ├── models/      # Mongoose models
│       │   ├── routes/      # API routes
│       │   ├── services/    # Business logic
│       │   ├── workers/     # BullMQ workers
│       │   ├── middleware/  # Express middleware
│       │   ├── types/       # TypeScript definitions
│       │   └── utils/       # Utility functions
│       ├── dist/            # Compiled output
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml       # Development services
├── package.json            # Root package management
└── README.md
```

## 🔧 Development Workflow

### Code Quality
```bash
# Lint code
yarn lint

# Fix linting issues
yarn lint:fix

# Format code
yarn format

# Check formatting
yarn format:check
```

### Building for Production
```bash
# Build client
cd packages/client && yarn build

# Build server
cd packages/server && yarn build

# Start production servers
cd packages/server && yarn start
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Helmet security headers
- Rate limiting
- Input validation with Zod
- File upload security checks

## 📈 Monitoring & Analytics

- Asset usage tracking
- Download analytics
- Processing job monitoring
- Storage usage metrics
- BullMQ dashboard for job queues

## 🌐 API Documentation

The API follows RESTful conventions with the following base structure:

- `GET /api/v1/assets` - List assets
- `POST /api/v1/assets/upload` - Upload assets
- `GET /api/v1/projects` - List projects
- `POST /api/v1/share` - Create share links

Complete API documentation will be available at `/api/docs` when running the server.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the troubleshooting guide

---

Built with ❤️ using React, Node.js, and modern web technologies.
