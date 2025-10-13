# Product Requirements Document (PRD)
## Mini FX Conversion Backend API

---

## 1. Overview

### 1.1 Purpose
Build a robust Node.js/TypeScript backend API to support foreign exchange (FX) conversion operations for merchants. This API will handle conversion transactions, persist data, integrate with external FX rate providers, and provide authenticated access to conversion data and analytics.

### 1.2 Target Implementation
This PRD is designed for implementation by Cursor AI, with clear technical specifications and implementation guidelines.

### 1.3 Tech Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **External API**: ExchangeRate-API or similar
- **Validation**: Zod
- **Testing**: Jest + Supertest (bonus)

---

## 2. Architecture Overview

### 2.1 High-Level Architecture
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────┐
│     Express.js REST API         │
│  ┌───────────────────────────┐  │
│  │  Auth Middleware (JWT)    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Routes & Controllers     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Business Logic Services  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Data Access Layer        │  │
│  └───────────────────────────┘  │
└──────────┬──────────────────────┘
           │
    ┌──────┴───────┐
    │              │
    ▼              ▼
┌──────────┐  ┌─────────────────┐
│ MongoDB  │  │ExchangeRate API │
└──────────┘  └─────────────────┘
```

### 2.2 Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── constants.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── logger.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validators.ts
│   │   ├── conversions/
│   │   │   ├── conversion.controller.ts
│   │   │   ├── conversion.service.ts
│   │   │   ├── conversion.routes.ts
│   │   │   ├── conversion.model.ts
│   │   │   └── conversion.validators.ts
│   │   ├── rates/
│   │   │   ├── rates.service.ts
│   │   │   └── rates.types.ts
│   │   └── analytics/
│   │       ├── analytics.controller.ts
│   │       ├── analytics.service.ts
│   │       └── analytics.routes.ts
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Conversion.model.ts
│   │   └── AuditLog.model.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   └── common.types.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── auth.test.ts
│   ├── conversions.test.ts
│   └── setup.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Database Schema (Mongoose Models)

### 3.1 User Model

```typescript
// src/models/User.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Don't return password hash by default
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

// Index for efficient queries
userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
```

### 3.2 Conversion Model

```typescript
// src/models/Conversion.model.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ConversionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface IConversion extends Document {
  _id: string;
  userId: Types.ObjectId;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  status: ConversionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const conversionSchema = new Schema<IConversion>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    fromCurrency: {
      type: String,
      required: [true, 'Source currency is required'],
      uppercase: true,
      trim: true,
      length: 3
    },
    toCurrency: {
      type: String,
      required: [true, 'Target currency is required'],
      uppercase: true,
      trim: true,
      length: 3
    },
    fromAmount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be at least 0.01'],
      max: [1000000, 'Amount cannot exceed 1,000,000']
    },
    toAmount: {
      type: Number,
      required: [true, 'Converted amount is required']
    },
    exchangeRate: {
      type: Number,
      required: [true, 'Exchange rate is required']
    },
    status: {
      type: String,
      enum: Object.values(ConversionStatus),
      default: ConversionStatus.COMPLETED
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes for efficient queries
conversionSchema.index({ userId: 1, createdAt: -1 });
conversionSchema.index({ fromCurrency: 1, toCurrency: 1 });
conversionSchema.index({ createdAt: -1 });
conversionSchema.index({ status: 1 });

export const Conversion = mongoose.model<IConversion>('Conversion', conversionSchema);
```

### 3.3 Audit Log Model

```typescript
// src/models/AuditLog.model.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: string;
  userId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      index: true
    },
    resource: {
      type: String,
      required: [true, 'Resource is required']
    },
    resourceId: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes for efficient queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
```

### 3.4 Supported Currencies (Configurable)
Minimum required: **USD, NGN, GBP, EUR**
Can be expanded to include: CAD, ZAR, KES, GHS, etc.

---

## 4. API Endpoints Specification

### 4.1 Authentication Endpoints

#### `POST /api/auth/register`
**Description**: Register a new merchant user

**Request Body**:
```json
{
  "email": "merchant@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "merchant@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-10-11T10:30:00Z"
    },
    "accessToken": "jwt-token-here",
    "refreshToken": "refresh-token-here"
  }
}
```

**Validation Rules**:
- Email: Valid email format, unique
- Password: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
- Names: Optional, max 50 chars each

---

#### `POST /api/auth/login`
**Description**: Authenticate and receive JWT tokens

**Request Body**:
```json
{
  "email": "merchant@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "merchant@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

**Error Response** (401):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

#### `POST /api/auth/refresh`
**Description**: Refresh access token using refresh token

**Request Body**:
```json
{
  "refreshToken": "refresh-token-here"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

### 4.2 FX Conversion Endpoints

#### `POST /api/conversions`
**Description**: Create a new FX conversion transaction

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "fromCurrency": "USD",
  "toCurrency": "NGN",
  "amount": 100.50
}
```

**Response** (201):
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

**Business Logic**:
1. Fetch current exchange rate from external API
2. Calculate converted amount: `toAmount = fromAmount × exchangeRate`
3. Store conversion in database
4. Create audit log entry
5. Return conversion details

**Validation**:
- `fromCurrency`: Valid ISO 4217 code, supported currency
- `toCurrency`: Valid ISO 4217 code, supported currency, different from `fromCurrency`
- `amount`: Positive number, max 2 decimal places, min: 0.01, max: 1,000,000

---

#### `GET /api/conversions`
**Description**: Retrieve user's conversion history with filtering and pagination

**Authentication**: Required

**Query Parameters**:
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 20, max: 100
- `fromCurrency` (optional): Filter by source currency
- `toCurrency` (optional): Filter by target currency
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `sortBy` (optional): Field to sort by (createdAt, fromAmount, toAmount), default: createdAt
- `sortOrder` (optional): asc | desc, default: desc

**Example Request**:
```
GET /api/conversions?page=1&limit=20&fromCurrency=USD&startDate=2025-10-01T00:00:00Z
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "conversions": [
      {
        "id": "507f1f77bcf86cd799439011",
        "fromCurrency": "USD",
        "toCurrency": "NGN",
        "fromAmount": 100.50,
        "toAmount": 158787.50,
        "exchangeRate": 1580.50,
        "status": "COMPLETED",
        "createdAt": "2025-10-11T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 95,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

#### `GET /api/conversions/:id`
**Description**: Get details of a specific conversion

**Authentication**: Required

**Response** (200):
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
    "createdAt": "2025-10-11T10:30:00Z",
    "updatedAt": "2025-10-11T10:30:00Z"
  }
}
```

**Error** (404):
```json
{
  "success": false,
  "error": {
    "code": "CONVERSION_NOT_FOUND",
    "message": "Conversion not found"
  }
}
```

---

### 4.3 Analytics Endpoints

#### `GET /api/analytics/summary`
**Description**: Get aggregated conversion statistics

**Authentication**: Required

**Query Parameters**:
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `groupBy` (optional): currency | day | week | month, default: currency

**Response** (200):
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
      },
      {
        "currency": "NGN",
        "totalAmount": 23715750.00,
        "conversionCount": 45
      },
      {
        "currency": "GBP",
        "totalAmount": 8500.50,
        "conversionCount": 30
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

---

#### `GET /api/analytics/timeline`
**Description**: Get conversion data over time for visualization (Bonus)

**Authentication**: Required

**Query Parameters**:
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `interval` (optional): hour | day | week | month, default: day
- `currency` (optional): Filter by specific currency

**Response** (200):
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "timestamp": "2025-10-01T00:00:00Z",
        "conversionCount": 12,
        "totalAmount": 1500.00,
        "currency": "USD"
      },
      {
        "timestamp": "2025-10-02T00:00:00Z",
        "conversionCount": 8,
        "totalAmount": 950.50,
        "currency": "USD"
      }
    ],
    "interval": "day",
    "period": {
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-10-11T23:59:59Z"
    }
  }
}
```

---

### 4.4 Exchange Rates Endpoints

#### `GET /api/rates`
**Description**: Get current exchange rates for supported currency pairs

**Authentication**: Required

**Query Parameters**:
- `base` (optional): Base currency, default: USD
- `symbols` (optional): Comma-separated list of target currencies

**Response** (200):
```json
{
  "success": true,
  "data": {
    "base": "USD",
    "rates": {
      "NGN": 1580.50,
      "GBP": 0.79,
      "EUR": 0.92,
      "CAD": 1.36
    },
    "timestamp": "2025-10-11T10:30:00Z",
    "source": "exchangerate-api"
  }
}
```

---

#### `GET /api/rates/convert`
**Description**: Get real-time conversion rate without creating a transaction

**Authentication**: Required

**Query Parameters**:
- `from` (required): Source currency code
- `to` (required): Target currency code
- `amount` (optional): Amount to convert, default: 1

**Response** (200):
```json
{
  "success": true,
  "data": {
    "from": "USD",
    "to": "NGN",
    "rate": 1580.50,
    "amount": 100,
    "convertedAmount": 158050.00,
    "timestamp": "2025-10-11T10:30:00Z"
  }
}
```

---

### 4.5 Audit Log Endpoints (Bonus)

#### `GET /api/audit-logs`
**Description**: Retrieve audit trail for the authenticated user

**Authentication**: Required

**Query Parameters**:
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 50, max: 100
- `action` (optional): Filter by action type
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response** (200):
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "action": "CONVERSION_CREATED",
        "resource": "conversion",
        "resourceId": "507f1f77bcf86cd799439012",
        "metadata": {
          "fromCurrency": "USD",
          "toCurrency": "NGN",
          "amount": 100.50
        },
        "ipAddress": "192.168.1.1",
        "createdAt": "2025-10-11T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 125,
      "itemsPerPage": 50
    }
  }
}
```

---

## 5. Database Configuration

### 5.1 MongoDB Connection Setup

```typescript
// src/config/database.ts

import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fincra_fx';
    
    await mongoose.connect(mongoUri, {
      // Mongoose 6+ no longer requires these options
      // They are included by default
    });

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};
```

### 5.2 MongoDB Indexes
All indexes are defined in the Mongoose schemas above. Key indexes include:

**User Collection**:
- `email` (unique)

**Conversion Collection**:
- `userId` + `createdAt` (compound)
- `fromCurrency` + `toCurrency` (compound)
- `createdAt` (descending)
- `status`

**AuditLog Collection**:
- `userId` + `createdAt` (compound)
- `action` + `createdAt` (compound)
- `resource` + `resourceId` (compound)

---

## 6. External API Integration

### 6.1 Exchange Rate Provider
**Primary**: ExchangeRate-API (https://exchangerate-api.com)
**Alternative**: Exchange Rates API (https://exchangerate.host)

### 6.2 Integration Service Requirements

**Implementation**:
```typescript
// src/modules/rates/rates.service.ts

interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

class RatesService {
  async fetchRates(base: string = 'USD'): Promise<ExchangeRateResponse>
  async convertCurrency(from: string, to: string, amount: number): Promise<number>
  async getCachedRate(from: string, to: string): Promise<number | null>
}
```

**Caching Strategy**:
- Cache exchange rates for 1 hour (configurable)
- Use in-memory cache or Redis (if available)
- Fallback to database if external API fails

**Error Handling**:
- Retry logic: 3 attempts with exponential backoff
- Graceful degradation: Use last known rate from cache
- Log all API failures for monitoring

---

## 7. Authentication & Authorization

### 7.1 JWT Implementation

**Token Structure**:
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  iat: number;  // Issued at
  exp: number;  // Expiry
}
```

**Token Configuration**:
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Algorithm**: HS256
- **Secret**: Environment variable `JWT_SECRET`

### 7.2 Password Security
- Hashing algorithm: **bcrypt**
- Salt rounds: **10**
- Password validation on registration
- No password storage in plain text

### 7.3 Middleware Implementation
```typescript
// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';

interface JWTPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided'
        }
      });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JWTPayload;

    // Attach user to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token'
      }
    });
  }
};
```

---

## 8. Error Handling

### 8.1 Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

### 8.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `CONVERSION_FAILED` | 500 | FX conversion failed |
| `RATE_API_ERROR` | 503 | External rate API unavailable |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `DUPLICATE_EMAIL` | 409 | Email already registered |

### 8.3 Error Handler Middleware

```typescript
// src/middleware/error.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fields: err.errors.reduce((acc, error) => {
            const path = error.path.join('.');
            acc[path] = error.message;
            return acc;
          }, {} as Record<string, string>)
        }
      }
    });
  }

  // Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const fields: Record<string, string> = {};
    Object.keys(err.errors).forEach(key => {
      fields[key] = err.errors[key].message;
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { fields }
      }
    });
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${field} already exists`,
        details: { field }
      }
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format'
      }
    });
  }

  // Application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An unexpected error occurred'
    }
  });
};
```

---

## 9. Environment Configuration

### 9.1 Required Environment Variables
```bash
# .env.example

# Server
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database
MONGODB_URI=mongodb://localhost:27017/fincra_fx
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fincra_fx?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Exchange Rate API
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest
EXCHANGE_RATE_API_KEY=optional-api-key
RATE_CACHE_TTL=3600

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 10. Logging & Monitoring

### 10.1 Logging Requirements
Use **Winston** or **Pino** for structured logging

**Log Levels**:
- `error`: Application errors, API failures
- `warn`: Deprecated API usage, rate limit warnings
- `info`: Conversion created, user registered
- `debug`: Detailed request/response data

**Log Format**:
```json
{
  "timestamp": "2025-10-11T10:30:00.000Z",
  "level": "info",
  "message": "Conversion created",
  "userId": "507f1f77bcf86cd799439011",
  "conversionId": "507f1f77bcf86cd799439012",
  "metadata": {
    "fromCurrency": "USD",
    "toCurrency": "NGN",
    "amount": 100.50
  }
}
```

### 10.2 Logger Implementation

```typescript
// src/utils/logger.ts

import winston from 'winston';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
              msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
          }
        )
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

### 10.3 Event Logging (Bonus)
Log the following events to `AuditLog`:
- `USER_REGISTERED`
- `USER_LOGIN`
- `USER_LOGOUT`
- `CONVERSION_CREATED`
- `CONVERSION_VIEWED`
- `RATES_FETCHED`

---

## 11. Validation Schemas (Zod)

### 11.1 Authentication Schemas
```typescript
// src/modules/auth/auth.validators.ts

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});
```

### 11.2 Conversion Schemas
```typescript
// src/modules/conversions/conversion.validators.ts

import { z } from 'zod';

const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'CAD', 'ZAR', 'KES', 'GHS'] as const;

export const createConversionSchema = z.object({
  fromCurrency: z.enum(SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: 'Unsupported source currency' })
  }),
  toCurrency: z.enum(SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: 'Unsupported target currency' })
  }),
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(0.01, 'Minimum amount is 0.01')
    .max(1000000, 'Maximum amount is 1,000,000')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places')
}).refine(
  (data) => data.fromCurrency !== data.toCurrency,
  {
    message: 'Source and target currencies must be different',
    path: ['toCurrency']
  }
);

export const getConversionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  fromCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  toCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'fromAmount', 'toAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate']
  }
);
```

### 11.3 Analytics Schemas
```typescript
// src/modules/analytics/analytics.validators.ts

import { z } from 'zod';

export const summaryQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.enum(['currency', 'day', 'week', 'month']).default('currency')
});

export const timelineQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  interval: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  currency: z.string().length(3).optional()
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate']
  }
);
```

---

## 12. Service Layer Architecture

### 12.1 Conversion Service Implementation

```typescript
// src/modules/conversions/conversion.service.ts

import { Conversion, IConversion, ConversionStatus } from '../../models/Conversion.model';
import { RatesService } from '../rates/rates.service';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../../middleware/error.middleware';

interface CreateConversionDTO {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

interface ConversionFilters {
  userId: string;
  fromCurrency?: string;
  toCurrency?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export class ConversionService {
  constructor(
    private ratesService: RatesService,
    private auditService: AuditService
  ) {}

  async createConversion(data: CreateConversionDTO): Promise<IConversion> {
    try {
      // Fetch exchange rate
      const rate = await this.ratesService.getRate(
        data.fromCurrency,
        data.toCurrency
      );

      // Calculate converted amount
      const toAmount = data.amount * rate;

      // Create conversion
      const conversion = await Conversion.create({
        userId: data.userId,
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        fromAmount: data.amount,
        toAmount,
        exchangeRate: rate,
        status: ConversionStatus.COMPLETED
      });

      // Log audit event
      await this.auditService.log({
        userId: data.userId,
        action: 'CONVERSION_CREATED',
        resource: 'conversion',
        resourceId: conversion._id.toString(),
        metadata: {
          fromCurrency: data.fromCurrency,
          toCurrency: data.toCurrency,
          amount: data.amount
        }
      });

      return conversion;
    } catch (error) {
      throw new AppError(
        500,
        'CONVERSION_FAILED',
        'Failed to create conversion',
        { cause: error.message }
      );
    }
  }

  async getConversions(filters: ConversionFilters) {
    const query: any = { userId: filters.userId };

    // Apply filters
    if (filters.fromCurrency) {
      query.fromCurrency = filters.fromCurrency;
    }
    if (filters.toCurrency) {
      query.toCurrency = filters.toCurrency;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    // Sorting
    const sortOptions: any = {};
    sortOptions[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (filters.page - 1) * filters.limit;

    // Execute query
    const [conversions, totalItems] = await Promise.all([
      Conversion.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(filters.limit)
        .lean(),
      Conversion.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / filters.limit);

    return {
      conversions,
      pagination: {
        currentPage: filters.page,
        totalPages,
        totalItems,
        itemsPerPage: filters.limit,
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1
      }
    };
  }

  async getConversionById(id: string, userId: string): Promise<IConversion> {
    const conversion = await Conversion.findOne({ _id: id, userId });

    if (!conversion) {
      throw new AppError(404, 'CONVERSION_NOT_FOUND', 'Conversion not found');
    }

    return conversion;
  }
}
```

### 12.2 Rates Service Implementation

```typescript
// src/modules/rates/rates.service.ts

import axios, { AxiosInstance } from 'axios';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

interface RateCache {
  [key: string]: {
    value: number;
    timestamp: number;
    ttl: number;
  };
}

export class RatesService {
  private client: AxiosInstance;
  private cache: RateCache = {};
  private cacheTTL: number;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.EXCHANGE_RATE_API_URL,
      timeout: 10000
    });

    this.cacheTTL = parseInt(process.env.RATE_CACHE_TTL || '3600');

    // Start cache cleanup
    this.startCacheCleanup();
  }

  async getRate(from: string, to: string): Promise<number> {
    // Check cache first
    const cacheKey = `${from}_${to}`;
    const cachedRate = this.getCachedRate(cacheKey);

    if (cachedRate !== null) {
      logger.debug('Using cached exchange rate', { from, to, rate: cachedRate });
      return cachedRate;
    }

    // Fetch from API
    try {
      const rate = await this.fetchRateFromAPI(from, to);
      this.setCacheRate(cacheKey, rate);
      return rate;
    } catch (error) {
      logger.error('Failed to fetch exchange rate', { from, to, error });
      throw new AppError(
        503,
        'RATE_API_ERROR',
        'Unable to fetch exchange rate at this time'
      );
    }
  }

  private async fetchRateFromAPI(from: string, to: string): Promise<number> {
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.get(`/${from}`);
        const rates = response.data.rates || response.data.conversion_rates;

        if (!rates || !rates[to]) {
          throw new Error(`Rate for ${to} not found`);
        }

        return rates[to];
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Rate API attempt ${attempt} failed`, { error: error.message });

        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError;
  }

  private getCachedRate(key: string): number | null {
    const entry = this.cache[key];

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl * 1000;

    if (isExpired) {
      delete this.cache[key];
      return null;
    }

    return entry.value;
  }

  private setCacheRate(key: string, value: number): void {
    this.cache[key] = {
      value,
      timestamp: Date.now(),
      ttl: this.cacheTTL
    };
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      Object.keys(this.cache).forEach(key => {
        const entry = this.cache[key];
        if (now - entry.timestamp > entry.ttl * 1000) {
          delete this.cache[key];
        }
      });
    }, 60000); // Cleanup every minute
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 12.3 Analytics Service Implementation

```typescript
// src/modules/analytics/analytics.service.ts

import { Conversion } from '../../models/Conversion.model';

export class AnalyticsService {
  async getSummary(userId: string, startDate?: Date, endDate?: Date) {
    const matchStage: any = { userId };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    // Total conversions
    const totalConversions = await Conversion.countDocuments(matchStage);

    // Total value by currency
    const totalByCurrency = await Conversion.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$fromCurrency',
          totalAmount: { $sum: '$fromAmount' },
          conversionCount: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Currency pair stats
    const currencyPairStats = await Conversion.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            from: '$fromCurrency',
            to: '$toCurrency'
          },
          count: { $sum: 1 },
          totalFromAmount: { $sum: '$fromAmount' },
          totalToAmount: { $sum: '$toAmount' },
          avgRate: { $avg: '$exchangeRate' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return {
      totalConversions,
      totalValueByCurrency: totalByCurrency.map(item => ({
        currency: item._id,
        totalAmount: item.totalAmount,
        conversionCount: item.conversionCount
      })),
      currencyPairStats: currencyPairStats.map(item => ({
        fromCurrency: item._id.from,
        toCurrency: item._id.to,
        count: item.count,
        totalFromAmount: item.totalFromAmount,
        totalToAmount: item.totalToAmount,
        avgRate: item.avgRate
      })),
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    };
  }

  async getTimeline(
    userId: string,
    startDate: Date,
    endDate: Date,
    interval: string = 'day',
    currency?: string
  ) {
    const matchStage: any = {
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (currency) {
      matchStage.fromCurrency = currency;
    }

    // Determine grouping format based on interval
    let dateFormat: string;
    switch (interval) {
      case 'hour':
        dateFormat = '%Y-%m-%dT%H:00:00.000Z';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const timeline = await Conversion.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          conversionCount: { $sum: 1 },
          totalAmount: { $sum: '$fromAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      timeline: timeline.map(item => ({
        timestamp: item._id,
        conversionCount: item.conversionCount,
        totalAmount: item.totalAmount,
        currency: currency || 'ALL'
      })),
      interval,
      period: { startDate, endDate }
    };
  }
}
```

---

## 13. Testing Requirements (Bonus)

### 13.1 Test Setup

```typescript
// tests/setup.ts

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

### 13.2 Sample Test Cases

```typescript
// tests/auth.test.ts

import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User.model';

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await User.create({
        email: 'test@example.com',
        passwordHash: 'hashed'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
```

---

## 14. Performance Requirements

### 14.1 Response Time Targets
- Authentication endpoints: < 200ms
- Conversion creation: < 500ms (including external API call)
- List endpoints: < 300ms
- Analytics endpoints: < 1000ms

### 14.2 Optimization Strategies
- MongoDB indexing on frequently queried fields
- Connection pooling (Mongoose handles this automatically)
- Rate caching (in-memory or Redis)
- Pagination for large datasets
- Use `.lean()` for read-only queries (faster than full Mongoose documents)
- Aggregation pipeline for analytics (database-level processing)

### 14.3 Rate Limiting

```typescript
// src/middleware/rateLimit.middleware.ts

import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    }
  }
});
```

---

## 15. Security Requirements

### 15.1 Security Checklist
- ✅ HTTPS only in production
- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Input validation and sanitization (Zod)
- ✅ NoSQL injection prevention (Mongoose sanitization)
- ✅ XSS prevention
- ✅ Rate limiting
- ✅ Password hashing (bcrypt)
- ✅ JWT secret in environment variable
- ✅ No sensitive data in logs
- ✅ Secure error messages (no stack traces in production)

### 15.2 Security Middleware Setup

```typescript
// src/app.ts

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// ... rest of app configuration
```

---

## 16. Deployment Considerations

### 16.1 MongoDB Atlas Setup
1. Create a MongoDB Atlas account
2. Create a new cluster (free tier available)
3. Whitelist your IP address or use `0.0.0.0/0` for development
4. Create a database user
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/fincra_fx`

### 16.2 Deployment Checklist
- ✅ Environment variables configured
- ✅ MongoDB connection string updated
- ✅ Database indexes created (Mongoose handles this)
- ✅ Health check endpoint: `GET /health`
- ✅ Logging configured
- ✅ Error tracking (optional: Sentry)
- ✅ HTTPS enabled
- ✅ CORS configured for production frontend
- ✅ Rate limiting enabled

### 16.3 Health Check Endpoint

```typescript
// src/app.ts

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'disconnected',
    externalApi: 'unknown'
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      health.database = 'connected';
    }

    // Optional: Check external API
    // const rateCheck = await axios.get(process.env.EXCHANGE_RATE_API_URL);
    // health.externalApi = 'available';

    res.status(200).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    res.status(503).json(health);
  }
});
```

### 16.4 Railway Deployment

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add MongoDB (or use MongoDB Atlas)
# For Atlas, just set MONGODB_URI environment variable

# 5. Set environment variables
railway variables set JWT_SECRET=<your-secret>
railway variables set MONGODB_URI=<your-mongodb-uri>
railway variables set EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest
railway variables set CORS_ORIGIN=https://your-frontend.vercel.app

# 6. Deploy
railway up

# 7. Get public URL
railway domain
```

---

## 17. Implementation Checklist for Cursor AI

### Phase 1: Project Setup
- [ ] Initialize Node.js/TypeScript project
- [ ] Install dependencies (express, mongoose, zod, bcrypt, jsonwebtoken, etc.)
- [ ] Configure TypeScript (strict mode)
- [ ] Setup MongoDB connection
- [ ] Create Mongoose models
- [ ] Setup environment configuration
- [ ] Configure ESLint and Prettier

### Phase 2: Core Infrastructure
- [ ] Implement error handling middleware
- [ ] Implement logging middleware (Winston)
- [ ] Implement authentication middleware
- [ ] Implement validation middleware
- [ ] Setup rate limiting
- [ ] Configure CORS and security headers (Helmet)

### Phase 3: Authentication Module
- [ ] Create User model
- [ ] Implement registration endpoint
- [ ] Implement login endpoint
- [ ] Implement refresh token endpoint
- [ ] Implement JWT generation and verification
- [ ] Add password hashing with bcrypt

### Phase 4: Exchange Rates Service
- [ ] Implement external API integration
- [ ] Add rate caching mechanism (in-memory)
- [ ] Implement error handling and retry logic
- [ ] Create rates endpoints (GET /api/rates, GET /api/rates/convert)

### Phase 5: Conversions Module
- [ ] Create Conversion model
- [ ] Implement POST /api/conversions endpoint
- [ ] Implement GET /api/conversions (with filtering and pagination)
- [ ] Implement GET /api/conversions/:id endpoint
- [ ] Add validation for currency codes and amounts

### Phase 6: Analytics Module
- [ ] Implement GET /api/analytics/summary endpoint
- [ ] Add aggregation queries (total by currency, currency pairs)
- [ ] Implement GET /api/analytics/timeline endpoint (bonus)
- [ ] Optimize queries with MongoDB aggregation pipeline

### Phase 7: Audit Logging (Bonus)
- [ ] Create AuditLog model
- [ ] Implement audit logging service
- [ ] Add audit logs for key events
- [ ] Implement GET /api/audit-logs endpoint

### Phase 8: Testing (Bonus)
- [ ] Setup Jest and Supertest
- [ ] Setup mongodb-memory-server for testing
- [ ] Write authentication tests
- [ ] Write conversion tests
- [ ] Write analytics tests

### Phase 9: Documentation & Deployment
- [ ] Create comprehensive README.md
- [ ] Add API documentation (Postman collection or Swagger)
- [ ] Add health check endpoint
- [ ] Prepare for deployment (environment setup)
- [ ] Test deployment on chosen platform

---

## 18. Success Criteria

### 18.1 Functional Requirements Met
✅ Users can register and authenticate  
✅ Users can create FX conversions  
✅ Conversions are stored in MongoDB  
✅ Users can retrieve conversion history with filters  
✅ Analytics endpoints provide aggregated data  
✅ External FX API integration works  
✅ All endpoints are authenticated  

### 18.2 Code Quality Standards
✅ TypeScript with strict mode  
✅ Consistent code formatting  
✅ Proper error handling  
✅ Input validation on all endpoints  
✅ Modular, maintainable architecture  
✅ No hardcoded values (use env variables)  

### 18.3 Bonus Features (Optional)
✅ Historical data visualization support  
✅ Pagination implemented  
✅ Audit trail functionality  
✅ Test coverage > 70%  
✅ Deployed and accessible via public URL  

---

## 19. Package.json Configuration

```json
{
  "name": "fincra-fx-backend",
  "version": "1.0.0",
  "description": "FX Conversion Backend API",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:prod": "NODE_ENV=production node dist/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "express-mongo-sanitize": "^2.2.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "@types/jest": "^29.5.10",
    "@types/supertest": "^6.0.2",
    "typescript": "^5.3.2",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.1",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "mongodb-memory-server": "^9.1.3",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 20. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 21. Application Entry Points

### 21.1 Server Entry Point

```typescript
// src/server.ts

import { app } from './app';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

### 21.2 Express App Configuration

```typescript
// src/app.ts

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { generalLimiter } from './middleware/rateLimit.middleware';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import conversionRoutes from './modules/conversions/conversion.routes';
import ratesRoutes from './modules/rates/rates.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import auditRoutes from './modules/audit/audit.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(generalLimiter);

// Health check
app.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
const API_PREFIX = process.env.API_PREFIX || '/api';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/conversions`, conversionRoutes);
app.use(`${API_PREFIX}/rates`, ratesRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/audit-logs`, auditRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export { app };
```

---

## 22. Route Examples

### 22.1 Authentication Routes

```typescript
// src/modules/auth/auth.routes.ts

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validators';
import { authLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();
const authController = new AuthController();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

export default router;
```

### 22.2 Conversion Routes

```typescript
// src/modules/conversions/conversion.routes.ts

import { Router } from 'express';
import { ConversionController } from './conversion.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { 
  createConversionSchema, 
  getConversionsQuerySchema 
} from './conversion.validators';

const router = Router();
const conversionController = new ConversionController();

// All conversion routes require authentication
router.use(authenticate);

router.post(
  '/',
  validate(createConversionSchema),
  conversionController.create
);

router.get(
  '/',
  validate(getConversionsQuerySchema, 'query'),
  conversionController.getAll
);

router.get(
  '/:id',
  conversionController.getById
);

export default router;
```

---

## 23. Controller Examples

### 23.1 Authentication Controller

```typescript
// src/modules/auth/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(req.body);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.refreshToken(req.body.refreshToken);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
```

### 23.2 Conversion Controller

```typescript
// src/modules/conversions/conversion.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ConversionService } from './conversion.service';
import { RatesService } from '../rates/rates.service';
import { AuditService } from '../audit/audit.service';

export class ConversionController {
  private conversionService: ConversionService;

  constructor() {
    const ratesService = new RatesService();
    const auditService = new AuditService();
    this.conversionService = new ConversionService(ratesService, auditService);
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversion = await this.conversionService.createConversion({
        userId: req.user!.id,
        ...req.body
      });

      res.status(201).json({
        success: true,
        data: conversion
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.conversionService.getConversions({
        userId: req.user!.id,
        ...req.query
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversion = await this.conversionService.getConversionById(
        req.params.id,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: conversion
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

## 24. Validation Middleware

```typescript
// src/middleware/validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject, source: 'body' | 'query' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'body' ? req.body : req.query;
      const validated = await schema.parseAsync(data);
      
      if (source === 'body') {
        req.body = validated;
      } else {
        req.query = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: {
              fields: error.errors.reduce((acc, err) => {
                const path = err.path.join('.');
                acc[path] = err.message;
                return acc;
              }, {} as Record<string, string>)
            }
          }
        });
      }
      next(error);
    }
  };
};
```

---

## 25. Authentication Service

```typescript
// src/modules/auth/auth.service.ts

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../../models/User.model';
import { AppError } from '../../middleware/error.middleware';

interface RegisterDTO {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginDTO {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: RegisterDTO) {
    // Check if user exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError(409, 'DUPLICATE_EMAIL', 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await User.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      },
      ...tokens
    };
  }

  async login(data: LoginDTO) {
    // Find user with password
    const user = await User.findOne({ email: data.email }).select('+passwordHash');
    
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      ...tokens
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
      ) as { userId: string; email: string };

      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
    }
  }

  private generateTokens(user: IUser) {
    const payload = {
      userId: user._id.toString(),
      email: user.email
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    return { accessToken, refreshToken };
  }
}
```

---

## 26. Audit Service Implementation

```typescript
// src/modules/audit/audit.service.ts

import { AuditLog, IAuditLog } from '../../models/AuditLog.model';

interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await AuditLog.create(entry);
    } catch (error) {
      // Log but don't throw - audit failures shouldn't break the app
      console.error('Failed to create audit log:', error);
    }
  }

  async getUserLogs(userId: string, filters: any) {
    const query: any = { userId };

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [logs, totalItems] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filters.limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / filters.limit);

    return {
      logs,
      pagination: {
        currentPage: filters.page,
        totalPages,
        totalItems,
        itemsPerPage: filters.limit
      }
    };
  }
}
```

---

## 27. README Template

```markdown
# Fincra FX Conversion Backend API

A robust Node.js/TypeScript backend API for foreign exchange conversion operations.

## Features

- ✅ User authentication with JWT
- ✅ Real-time FX conversions with external rate provider
- ✅ Conversion history with advanced filtering
- ✅ Analytics dashboard data aggregation
- ✅ Audit trail logging
- ✅ Rate limiting and security headers
- ✅ Comprehensive error handling
- ✅ MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT
- **Validation**: Zod
- **Testing**: Jest + Supertest

## Prerequisites

- Node.js 18 or higher
- MongoDB (local or Atlas)
- npm or yarn

## Installation

```bash
# Clone repository
git clone <repo-url>
cd fincra-fx-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## Environment Variables

```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fincra_fx
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest
CORS_ORIGIN=http://localhost:5173
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Conversions

- `POST /api/conversions` - Create conversion
- `GET /api/conversions` - List conversions (with filters)
- `GET /api/conversions/:id` - Get conversion details

### Analytics

- `GET /api/analytics/summary` - Get analytics summary
- `GET /api/analytics/timeline` - Get timeline data

### Rates

- `GET /api/rates` - Get current exchange rates
- `GET /api/rates/convert` - Convert currency

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Deployment

### Railway

```bash
railway login
railway init
railway up
```

### Render

Push to GitHub and connect to Render dashboard.

## Project Structure

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── modules/         # Feature modules
│   ├── auth/
│   ├── conversions/
│   ├── rates/
│   └── analytics/
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## License

MIT
```

---

## 28. Final Notes

### 28.1 MongoDB Best Practices
- Always use indexes for frequently queried fields
- Use `.lean()` for read-only queries to improve performance
- Use aggregation pipeline for complex analytics
- Implement proper error handling for connection issues
- Use connection pooling (Mongoose handles this automatically)

### 28.2 Security Reminders
- Never commit `.env` file
- Use strong JWT secrets (min 32 characters)
- Implement rate limiting on all endpoints
- Sanitize all user inputs
- Use HTTPS in production
- Keep dependencies updated

### 28.3 Performance Tips
- Cache exchange rates for 1 hour
- Use MongoDB indexes effectively
- Implement pagination for large datasets
- Use `.lean()` for read operations
- Monitor and log slow queries

---

**END OF PRD**

This comprehensive PRD provides all the specifications needed to build the Fincra FX Conversion Backend API using Node.js, TypeScript, Express, and MongoDB with Mongoose. The document includes complete code examples, deployment guides, and best practices for Cursor AI to successfully implement the system.