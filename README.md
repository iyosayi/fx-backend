# Fincra FX Conversion Backend API

A robust NestJS/TypeScript backend API for foreign exchange (FX) conversion operations supporting merchants with real-time currency conversions, conversion history, and analytics.

## Features

- ✅ User authentication with JWT (access & refresh tokens)
- ✅ Real-time FX conversions with external rate provider
- ✅ Conversion history with advanced filtering, pagination, and sorting
- ✅ Analytics dashboard with aggregated statistics
- ✅ Audit trail logging for compliance
- ✅ Rate limiting and comprehensive security headers
- ✅ In-memory caching for exchange rates with TTL
- ✅ MongoDB with Mongoose ODM
- ✅ Comprehensive error handling with standardized responses

## Tech Stack

- **Framework**: NestJS 10
- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT with Passport
- **Validation**: Class-validator & Class-transformer
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting (Throttler)
- **External API**: ExchangeRate-API

## Architecture & Design Decisions

### Overall Approach

This API follows a **modular monolith architecture** using NestJS, prioritizing simplicity, rapid development, and clear separation of concerns. The architecture is designed to be pragmatic for an MVP while maintaining a clear evolution path to distributed systems if needed.

**Key Architectural Principles**:
- **Domain-Driven Modules**: Each feature (auth, conversions, rates, analytics, audit) is self-contained with its own controllers, services, DTOs, and business logic
- **Dependency Injection**: Leveraging NestJS's built-in DI container for loose coupling and testability
- **Centralized Error Handling**: Custom `AllExceptionsFilter` ensures consistent error responses across all endpoints
- **Middleware Pipeline**: Global validation pipes, guards, and filters applied at the application level for consistent behavior

### Design Decisions & Trade-offs

#### 1. **Authentication: JWT with Refresh Tokens**

**Decision**: Implemented stateless JWT authentication with separate access (15m) and refresh (7d) tokens.

**Why**:
- ✅ Stateless and horizontally scalable (no server-side session storage)
- ✅ Works seamlessly with mobile apps and SPAs
- ✅ Reduces database lookups for every request
- ✅ Refresh token pattern balances security with UX

**Trade-offs**:
- ❌ Cannot invalidate tokens server-side without additional infrastructure (Redis blacklist)
- ❌ Tokens can grow large with extensive claims
- ❌ Requires careful handling of token storage on client-side

**Alternative Considered**: Session-based auth with MongoDB (rejected due to scalability concerns and multi-client support requirements)

#### 2. **Database: MongoDB (NoSQL)**

**Decision**: Used MongoDB with Mongoose ODM for all data persistence.

**Why**:
- ✅ Flexible schema for evolving conversion metadata and analytics
- ✅ Excellent performance for high-volume write operations (conversions)
- ✅ Built-in aggregation pipeline perfect for analytics queries
- ✅ Horizontal scaling through sharding if needed
- ✅ JSON-native storage aligns well with JavaScript/TypeScript ecosystem

**Trade-offs**:
- ❌ No built-in ACID transactions across collections (less critical for this domain)
- ❌ Manual index management required for optimal performance
- ❌ Potential data duplication across documents

**Alternative Considered**: PostgreSQL with TypeORM (rejected—ACID transactions not critical for this use case, and MongoDB's aggregation pipeline is superior for analytics)

#### 3. **Caching: In-Memory Cache**

**Decision**: Implemented a simple in-memory cache for exchange rates with 1-hour TTL and automatic cleanup.

**Why**:
- ✅ Zero infrastructure dependencies (no Redis required)
- ✅ Sub-millisecond latency for cached rates
- ✅ Dramatically reduces external API calls (cost savings)
- ✅ Simple implementation with predictable behavior
- ✅ Sufficient for single-instance deployments

**Trade-offs**:
- ❌ Cache is not shared across multiple server instances
- ❌ Cache is lost on server restart
- ❌ Memory consumption grows with cache size (mitigated by TTL and cleanup)

**When to Upgrade**: Move to Redis when deploying multiple instances or when cache persistence across restarts becomes critical. The `RatesService` is designed to make this migration straightforward.

#### 4. **Rate Provider: Single External API**

**Decision**: Using a single exchange rate API (ExchangeRate-API) with retry logic and exponential backoff.

**Why**:
- ✅ Simplifies initial implementation and reduces complexity
- ✅ No API key required for basic tier (faster MVP)
- ✅ Retry logic (3 attempts) handles transient failures
- ✅ Caching layer reduces dependency on external service

**Trade-offs**:
- ❌ Single point of failure for rate data
- ❌ No fallback if primary provider is down
- ❌ Rate accuracy depends on single source

**Future Enhancement**: Implement a **rate aggregation service** that polls multiple providers (OpenExchangeRates, Fixer.io) and either averages rates or uses the most recent successful response.

#### 5. **Validation: DTO-Based with Class-Validator**

**Decision**: Validation enforced at the DTO level using decorators, applied globally via `ValidationPipe`.

**Why**:
- ✅ Declarative validation rules co-located with type definitions
- ✅ Automatic transformation and type coercion
- ✅ Prevents invalid data from entering business logic
- ✅ Clear, reusable validation schemas
- ✅ Automatically strips unknown properties (`whitelist: true`)

**Trade-offs**:
- ❌ Validation logic tightly coupled to DTOs (harder to reuse across layers)
- ❌ Complex cross-field validations require custom validators

**Implementation**: Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true` ensures robust input sanitization.

#### 6. **Audit Logging: Asynchronous with Fire-and-Forget**

**Decision**: Audit logs are written asynchronously without blocking the main request flow.

**Why**:
- ✅ Doesn't impact conversion response time
- ✅ Failures in audit logging don't affect core operations
- ✅ Simpler implementation for MVP

**Trade-offs**:
- ❌ Audit log failures are silent (could miss compliance data)
- ❌ No guarantee of audit log delivery

**Future Enhancement**: Implement a message queue (RabbitMQ, SQS) for guaranteed audit log delivery with retry mechanisms.

#### 7. **Error Handling: Custom Exception Filter**

**Decision**: Centralized `AllExceptionsFilter` with standardized error response format and custom `AppException` class.

**Why**:
- ✅ Consistent error structure across all endpoints
- ✅ Environment-aware (hides stack traces in production)
- ✅ Maps HTTP exceptions and database errors to user-friendly messages
- ✅ Integrates with Winston logger for error tracking

**Trade-offs**:
- ❌ Custom exception class adds a layer of abstraction
- ❌ Developers must remember to use `AppException` instead of standard NestJS exceptions

#### 8. **Synchronous Conversions**

**Decision**: Conversion operations are processed synchronously in the request-response cycle.

**Why**:
- ✅ Simpler implementation and debugging
- ✅ Immediate feedback to users
- ✅ No need for job queue infrastructure
- ✅ Acceptable latency for single conversions (<500ms with caching)

**Trade-offs**:
- ❌ Request blocks until external rate API responds
- ❌ Cannot handle batch conversions efficiently
- ❌ Timeout risk if external API is slow

**When to Change**: Migrate to async processing (with job queues) if:
- Batch conversion requests are needed
- External API latency becomes unpredictable
- Background processing/retries are required

### Performance Optimizations

1. **Lean Queries**: Using `.lean()` on read operations to return plain JavaScript objects instead of Mongoose documents (40% faster)
2. **Compound Indexes**: Strategic indexes on `{userId, createdAt}`, `{fromCurrency, toCurrency}`, and `{status}` for fast filtering
3. **Aggregation Pipeline**: Analytics calculations pushed to MongoDB for efficient server-side processing
4. **Connection Pooling**: Mongoose's default connection pooling for concurrent request handling
5. **Rate Limiting**: Throttler guard prevents abuse and maintains consistent performance under load

### Security Considerations

1. **Helmet**: Sets 11+ security headers (X-Frame-Options, CSP, etc.)
2. **CORS**: Configured with explicit origins (no wildcards in production)
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Password Hashing**: bcrypt with 10 salt rounds
5. **Input Sanitization**: Automatic via `ValidationPipe` whitelist
6. **JWT Expiry**: Short-lived access tokens (15m) limit exposure window
7. **Environment Variables**: Sensitive data never committed to version control

### Scalability Path

**Current State (MVP)**: Single Node.js instance + MongoDB

**Next Steps (10K+ users)**:
1. **Horizontal Scaling**: Deploy multiple instances behind a load balancer (Nginx, AWS ALB)
2. **Redis Integration**: Shared cache layer across instances
3. **Database Replication**: MongoDB replica set for high availability
4. **CDN**: Serve static assets and cache responses at edge locations

**Future State (100K+ users)**:
1. **Microservices**: Split into separate services (Auth, Conversions, Rates, Analytics)
2. **Message Queues**: RabbitMQ/AWS SQS for async processing
3. **Event Sourcing**: Immutable conversion events for audit trail
4. **Database Sharding**: Partition by userId for horizontal data scaling
5. **Multi-Region Deployment**: Geographic distribution for low latency

### Why This Approach?

This architecture prioritizes **time-to-market** and **operational simplicity** while maintaining **clear upgrade paths**. The monolith structure allows a small team to move quickly without the overhead of distributed systems, while the modular design makes it straightforward to extract services when needed.

The trade-offs favor **pragmatism over perfection**—choosing in-memory caching over Redis, synchronous processing over queues, and a single rate provider over aggregation. These decisions reduce complexity and infrastructure costs while delivering 99% of the required functionality.

As the product grows, the architecture supports incremental evolution rather than requiring a full rewrite.

## Prerequisites

- Node.js 20 or higher (LTS recommended)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

```bash
# Clone repository
git clone <repo-url>
cd fincra-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run start:dev
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database
MONGODB_URI=mongodb://localhost:27017/fincra_fx

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Exchange Rate API
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest
RATE_CACHE_TTL=3600

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Available Scripts

```bash
# Development
npm run start:dev         # Start with hot-reload
npm run start:debug       # Start with debugging

# Production
npm run build             # Build for production
npm run start:prod        # Run production build

# Testing
npm run test              # Run unit tests
npm run test:watch        # Run tests in watch mode
npm run test:cov          # Run tests with coverage
npm run test:e2e          # Run e2e tests

# Linting & Formatting
npm run lint              # Lint code
npm run format            # Format code with Prettier
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-10-11T10:30:00Z"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Conversion Endpoints (Protected)

All conversion endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-access-token>
```

#### Create Conversion
```http
POST /api/conversions
Content-Type: application/json
Authorization: Bearer <token>

{
  "fromCurrency": "USD",
  "toCurrency": "NGN",
  "amount": 100.50
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "fromCurrency": "USD",
    "toCurrency": "NGN",
    "fromAmount": 100.50,
    "toAmount": 158787.50,
    "exchangeRate": 1580.50,
    "status": "COMPLETED",
    "createdAt": "2025-10-11T10:30:00Z"
  }
}
```

#### Get Conversions (with filtering)
```http
GET /api/conversions?page=1&limit=20&fromCurrency=USD&startDate=2025-10-01
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `fromCurrency` (optional): Filter by source currency
- `toCurrency` (optional): Filter by target currency
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)
- `sortBy` (optional): Field to sort by (createdAt, fromAmount, toAmount)
- `sortOrder` (optional): asc | desc (default: desc)

#### Get Conversion by ID
```http
GET /api/conversions/:id
Authorization: Bearer <token>
```

### Exchange Rates Endpoints (Protected)

#### Get Current Rates
```http
GET /api/rates?base=USD&symbols=NGN,GBP,EUR
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "base": "USD",
    "rates": {
      "NGN": 1580.50,
      "GBP": 0.79,
      "EUR": 0.92
    },
    "timestamp": "2025-10-11T10:30:00Z",
    "source": "exchangerate-api"
  }
}
```

#### Convert Currency (Preview)
```http
GET /api/rates/convert?from=USD&to=NGN&amount=100
Authorization: Bearer <token>
```

### Analytics Endpoints (Protected)

#### Get Summary
```http
GET /api/analytics/summary?startDate=2025-10-01&endDate=2025-10-11
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalConversions": 150,
    "totalValueByCurrency": [
      {
        "currency": "USD",
        "totalAmount": 15000.00,
        "conversionCount": 45
      }
    ],
    "currencyPairStats": [
      {
        "fromCurrency": "USD",
        "toCurrency": "NGN",
        "count": 45,
        "totalFromAmount": 15000.00,
        "totalToAmount": 23715750.00,
        "avgRate": 1580.50
      }
    ],
    "period": {
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-10-11T23:59:59Z"
    }
  }
}
```

#### Get Timeline
```http
GET /api/analytics/timeline?startDate=2025-10-01&endDate=2025-10-11&interval=day
Authorization: Bearer <token>
```

### Audit Logs Endpoints (Protected)

#### Get Audit Logs
```http
GET /api/audit-logs?page=1&limit=50&action=CONVERSION_CREATED
Authorization: Bearer <token>
```

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-11T10:30:00Z",
  "uptime": 12345.67,
  "database": "connected"
}
```

## Supported Currencies

- USD (US Dollar)
- NGN (Nigerian Naira)
- GBP (British Pound)
- EUR (Euro)
- CAD (Canadian Dollar)
- ZAR (South African Rand)
- KES (Kenyan Shilling)
- GHS (Ghanaian Cedi)

## Error Response Format

All errors follow a standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `TOKEN_EXPIRED` | 401 | JWT token has expired |
| `INVALID_TOKEN` | 401 | Invalid JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONVERSION_NOT_FOUND` | 404 | Conversion not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `DUPLICATE_ENTRY` | 409 | Duplicate entry |
| `INVALID_ID` | 400 | Invalid ID format |
| `CONVERSION_FAILED` | 500 | FX conversion failed |
| `RATE_API_ERROR` | 503 | External rate API unavailable |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |

## Project Structure

```
src/
├── common/                   # Shared resources
│   ├── decorators/          # Custom decorators (CurrentUser)
│   ├── filters/             # Exception filters
│   ├── guards/              # Auth guards (JWT)
│   ├── interceptors/        # Request/response interceptors
│   └── pipes/               # Validation pipes
├── config/                   # Configuration files
│   └── constants.ts         # App constants
├── modules/                  # Feature modules
│   ├── auth/                # Authentication module
│   │   ├── dto/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── conversions/         # Conversions module
│   ├── rates/               # Exchange rates module
│   ├── analytics/           # Analytics module
│   └── audit/               # Audit logging module
├── schemas/                  # Mongoose schemas
│   ├── user.schema.ts
│   ├── conversion.schema.ts
│   └── audit-log.schema.ts
├── utils/                    # Utility functions
│   └── logger.service.ts    # Winston logger
├── app.module.ts            # Root module
├── app.controller.ts        # Health check controller
├── app.service.ts           # App service
└── main.ts                  # Application entry point
```

## Database Schema

### User Collection
- email (unique, indexed)
- passwordHash (select: false)
- firstName
- lastName
- createdAt, updatedAt

### Conversion Collection
- userId (indexed)
- fromCurrency
- toCurrency
- fromAmount
- toAmount
- exchangeRate
- status (PENDING, COMPLETED, FAILED)
- createdAt, updatedAt

**Indexes**:
- `{ userId: 1, createdAt: -1 }`
- `{ fromCurrency: 1, toCurrency: 1 }`
- `{ createdAt: -1 }`
- `{ status: 1 }`

### AuditLog Collection
- userId (indexed)
- action
- resource
- resourceId
- metadata
- ipAddress
- userAgent
- createdAt

**Indexes**:
- `{ userId: 1, createdAt: -1 }`
- `{ action: 1, createdAt: -1 }`
- `{ resource: 1, resourceId: 1 }`

## Security Features

- **Helmet**: Sets security-related HTTP headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Throttle requests to prevent abuse
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds of 10
- **Input Validation**: Class-validator for DTO validation
- **Error Handling**: Sanitized error messages (no stack traces in production)
- **Request Size Limits**: 10kb limit on request body

## Performance Optimizations

- **Rate Caching**: In-memory cache with 1-hour TTL
- **MongoDB Indexes**: Optimized for frequent queries
- **Lean Queries**: Using `.lean()` for read-only operations
- **Aggregation Pipeline**: Database-level processing for analytics
- **Connection Pooling**: Mongoose automatic connection pooling
- **Retry Logic**: Exponential backoff for external API calls

## Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (min 32 characters)
3. Configure `MONGODB_URI` for production database
4. Set appropriate `CORS_ORIGIN`
5. Configure rate limiting based on expected traffic

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Whitelist your server IP or use `0.0.0.0/0` for any IP
4. Create a database user
5. Get connection string and update `MONGODB_URI`

### Deploy to Railway/Render/Heroku

```bash
# Build application
npm run build

# Start production server
npm run start:prod
```

Make sure to set all environment variables in your hosting platform's dashboard.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```



Built with ❤️ using NestJS
