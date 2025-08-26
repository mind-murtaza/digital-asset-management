# Digital Asset Management - Client

The frontend application for the Digital Asset Management (DAM) platform. Built with React, TypeScript, and Tailwind CSS, providing a modern, responsive interface for managing digital assets.

## 🎯 Overview

This React application serves as the user interface for the DAM platform, enabling users to:
- Upload and manage digital assets
- Browse assets in a gallery view
- Search and filter assets
- Preview and download files
- Manage projects and organizations
- Create and manage share links

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **React Hook Form** - Performant forms with easy validation
- **Axios** - HTTP client for API communication
- **Zod** - Schema validation and type inference
- **Lucide React** - Beautiful, consistent icon library
- **React Redux** - State management (if needed for complex state)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
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
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   VITE_APP_NAME=Digital Asset Management
   ```

3. **Start Development Server**
   ```bash
   yarn dev
   ```

4. **Access the Application**
   - Open http://localhost:5173 in your browser

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Input, Modal, etc.)
│   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   ├── forms/          # Form components and validation schemas
│   └── assets/         # Asset-specific components
├── pages/              # Page components and views
│   ├── Dashboard/      # Main dashboard
│   ├── Assets/         # Asset listing and management
│   ├── Projects/       # Project management
│   ├── Upload/         # File upload interface
│   └── Auth/           # Authentication pages
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── useAssets.ts    # Asset management hook
│   └── useProjects.ts  # Project management hook
├── services/           # API service layer
│   ├── api.ts          # Base API configuration
│   ├── auth.ts         # Authentication services
│   ├── assets.ts       # Asset-related API calls
│   └── projects.ts     # Project-related API calls
├── types/              # TypeScript type definitions
│   ├── api.ts          # API response types
│   ├── models.ts       # Domain model types
│   └── common.ts       # Common types and interfaces
├── utils/              # Utility functions
│   ├── validation.ts   # Form validation utilities
│   ├── format.ts       # Data formatting functions
│   └── constants.ts    # Application constants
├── lib/                # Third-party library configurations
│   └── zod.ts          # Zod schema definitions
└── App.tsx             # Main application component
```

## 🎨 UI/UX Design

### Design Principles
- **Minimal and Clean**: Focus on content and functionality
- **Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Accessible**: WCAG 2.1 AA compliance
- **Fast**: Optimized for performance with lazy loading and code splitting

### Key Components

#### Asset Gallery
- Grid and list view modes
- Drag-and-drop upload
- Search and filtering
- Infinite scroll pagination
- Quick preview and actions

#### File Upload
- Multi-file selection
- Progress indicators
- Drag-and-drop zone
- File type validation
- Size limits and error handling

#### Asset Preview
- Image viewer with zoom and pan
- Video player with controls
- Document viewer (PDF, DOC, etc.)
- Download functionality

## 🔧 Development Scripts

```bash
# Development
yarn dev              # Start development server
yarn build            # Build for production
yarn preview          # Preview production build

# Code Quality
yarn lint             # Run ESLint
yarn lint:fix         # Fix ESLint issues
yarn format           # Format code with Prettier
yarn format:check     # Check code formatting

# Type Checking
yarn type-check       # Run TypeScript type checking
```

## 🔐 Authentication & Authorization

- JWT-based authentication
- Protected routes with role-based access
- Automatic token refresh
- Secure logout with token invalidation

## 📡 API Integration

### Base Configuration
```typescript
// services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Service Layer Pattern
```typescript
// services/assets.ts
export const assetService = {
  async getAssets(params: AssetFilters) {
    const response = await api.get('/assets', { params });
    return response.data;
  },

  async uploadAsset(file: File, metadata: AssetMetadata) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await api.post('/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progress) => {
        // Handle upload progress
      }
    });
    return response.data;
  }
};
```

## 🎭 State Management

### Local State
- React hooks for component-level state
- useState for simple state
- useReducer for complex component state

### Global State (if needed)
- React Context for shared state
- Redux Toolkit for complex state management
- React Query for server state management

## 🧪 Testing

```bash
# Unit tests
yarn test

# E2E tests (if implemented)
yarn test:e2e

# Component tests
yarn test:components
```

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

Tailwind CSS classes are used for responsive design:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

## 🌟 Performance Optimizations

- **Code Splitting**: Dynamic imports for route-based splitting
- **Image Optimization**: Lazy loading and responsive images
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching**: Service worker for offline functionality (future)
- **Virtual Scrolling**: For large asset lists

## 🚢 Deployment

### Build Process
```bash
yarn build
```

This creates an optimized production build in the `dist/` directory.

### Environment Variables for Production
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_APP_NAME=Your DAM Platform
VITE_SENTRY_DSN=your-sentry-dsn (optional)
```

### Docker Deployment
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🐛 Error Handling

### Global Error Boundary
```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### API Error Handling
```typescript
// services/api.ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      logout();
      navigate('/login');
    }
    return Promise.reject(error);
  }
);
```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [React Hook Form Documentation](https://react-hook-form.com)
- [Zod Documentation](https://zod.dev)

## 🤝 Contributing

1. Follow the established coding patterns
2. Write tests for new features
3. Update documentation as needed
4. Ensure TypeScript types are properly defined
5. Test across different screen sizes

## 📄 License

This project is part of the Digital Asset Management platform and follows the same license terms.
