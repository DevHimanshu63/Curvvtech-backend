# Smart Device Management Platform

A comprehensive backend system for managing smart devices with user authentication, device management, logging, and analytics capabilities.

## 🚀 Features

### Core Features
- **User Management**: Registration, authentication with JWT
- **Device Management**: CRUD operations for smart devices
- **Device Monitoring**: Heartbeat system and status tracking
- **Logging & Analytics**: Device activity logs and usage analytics
- **Rate Limiting**: 100 requests/minute per user
- **Background Jobs**: Auto-deactivation of inactive devices

### Advanced Features (Bonus)
- **Docker Support**: Complete containerization setup
- **Unit Tests**: Comprehensive test coverage with Jest
- **MongoDB**: NoSQL database with optimized schemas
- **Security**: Helmet, CORS, input validation
- **Cron Jobs**: Automated device health monitoring

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Validation**: Joi schema validation
- **Testing**: Jest with Supertest
- **Containerization**: Docker & Docker Compose
- **Background Jobs**: node-cron
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-device-management-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB locally
   mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6.0
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

### Option 2: Docker Setup

1. **Clone and setup environment**
   ```bash
   git clone <repository-url>
   cd smart-device-management-platform
   cp env.example .env
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - API: http://localhost:3000
   - MongoDB Express: http://localhost:8081 (admin/admin123)

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Device Management

#### POST /devices
Register a new device.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Living Room Light",
  "type": "light",
  "status": "active",
  "location": "Living Room",
  "description": "Smart LED light"
}
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "d1",
    "name": "Living Room Light",
    "type": "light",
    "status": "active",
    "last_active_at": null,
    "owner_id": "u1"
  }
}
```

#### GET /devices
List devices with filtering and pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: Filter by device type (light, thermostat, camera, etc.)
- `status`: Filter by status (active, inactive, maintenance, offline)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "devices": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### PATCH /devices/:id
Update device details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Device Name",
  "status": "inactive",
  "location": "New Location"
}
```

#### DELETE /devices/:id
Remove a device.

**Headers:** `Authorization: Bearer <token>`

#### POST /devices/:id/heartbeat
Update device heartbeat.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device heartbeat recorded",
  "last_active_at": "2025-08-17T10:15:30Z"
}
```

### Logs & Analytics

#### POST /devices/:id/logs
Create a log entry for a device.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "event": "units_consumed",
  "value": 2.5,
  "severity": "info",
  "source": "device"
}
```

#### GET /devices/:id/logs
Fetch device logs with filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Number of logs (default: 10, max: 100)
- `page`: Page number (default: 1)
- `event`: Filter by event type
- `severity`: Filter by severity (info, warning, error, critical)
- `startDate`: Start date filter
- `endDate`: End date filter

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "l1",
      "event": "units_consumed",
      "value": 2.5,
      "timestamp": "2025-08-17T08:00:00Z",
      "severity": "info",
      "source": "device"
    }
  ],
  "pagination": {...}
}
```

#### GET /devices/:id/usage
Get aggregated usage data.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `range`: Time range (1h, 24h, 7d, 30d, default: 24h)

**Response:**
```json
{
  "success": true,
  "device_id": "d2",
  "range": "24h",
  "total_units": 15.7,
  "log_count": 24,
  "total_units_last_24h": 15.7
}
```

### System

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Smart Device Management Platform is running",
  "timestamp": "2025-08-17T10:15:30Z"
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage
The project includes comprehensive tests for:
- Authentication endpoints
- Device management
- Input validation
- Error handling

## 🐳 Docker

### Build Image
```bash
docker build -t smart-device-platform .
```

### Run Container
```bash
docker run -p 3000:3000 smart-device-platform
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/smart_device_platform |
| `JWT_SECRET` | JWT signing secret | your-super-secret-jwt-key-change-in-production |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `DEVICE_INACTIVITY_THRESHOLD` | Hours before auto-deactivation | 24 |

## 📁 Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── deviceController.js  # Device management
│   └── logController.js     # Logs and analytics
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── errorHandler.js     # Error handling
│   └── validate.js         # Input validation
├── models/
│   ├── User.js             # User schema
│   ├── Device.js           # Device schema
│   └── Log.js              # Log schema
├── routes/
│   ├── auth.js             # Auth routes
│   ├── devices.js          # Device routes
│   └── logs.js             # Log routes
├── services/
│   └── cronService.js      # Background jobs
├── tests/
│   ├── auth.test.js        # Auth tests
│   ├── device.test.js      # Device tests
│   └── setup.js            # Test setup
├── validations/
│   ├── auth.js             # Auth validation
│   ├── device.js           # Device validation
│   └── log.js              # Log validation
└── server.js               # Main application
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Input Validation**: Joi schema validation
- **Rate Limiting**: 100 requests/minute per user
- **CORS Protection**: Cross-origin resource sharing
- **Helmet**: Security headers
- **SQL Injection Protection**: Mongoose ODM

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ['user', 'admin']),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Devices Collection
```javascript
{
  _id: ObjectId,
  name: String,
  type: String (enum: ['light', 'thermostat', 'camera', 'sensor', 'smart_meter', 'switch', 'other']),
  status: String (enum: ['active', 'inactive', 'maintenance', 'offline']),
  owner_id: ObjectId (ref: 'User'),
  last_active_at: Date,
  location: String,
  description: String,
  metadata: Map,
  isOnline: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Logs Collection
```javascript
{
  _id: ObjectId,
  device_id: ObjectId (ref: 'Device'),
  event: String,
  value: Mixed,
  timestamp: Date,
  severity: String (enum: ['info', 'warning', 'error', 'critical']),
  source: String (enum: ['device', 'system', 'user']),
  metadata: Map,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Background Jobs

The system includes automated background jobs:

1. **Device Health Check** (Every 6 hours)
   - Monitors device activity
   - Marks inactive devices as offline

2. **Auto-deactivation** (Every hour)
   - Deactivates devices inactive for 24+ hours
   - Configurable threshold via environment variable

3. **Log Cleanup** (Daily at 2 AM)
   - Removes logs older than 30 days
   - Maintains database performance

## 📝 Assumptions

1. **Device Types**: Predefined set of device types (light, thermostat, camera, etc.)
2. **User Roles**: Simple role system (user, admin)
3. **Rate Limiting**: Per-user rate limiting (100 req/min)
4. **Data Retention**: Logs kept for 30 days
5. **Device Ownership**: One user per device
6. **Heartbeat**: Devices send status updates via API
7. **Analytics**: Focus on smart meter usage tracking



---

**Built with ❤️ for Curvvtech Backend Developer Assignment**
