# 🚀 Postman Testing Guide - Smart Device Management Platform

## 📋 **Setup Instructions**

### **Step 1: Import Postman Collection**

1. **Open Postman**
2. **Import Collection**:
   - Click "Import" button
   - Select the file: `Smart_Device_Management_Platform.postman_collection.json`
   - Click "Import"

### **Step 2: Setup Environment Variables**

1. **Create Environment**:
   - Click "Environments" → "New"
   - Name: `Smart Device Platform`
   - Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | (leave empty) | (will be filled automatically) |
| `refresh_token` | (leave empty) | (will be filled automatically) |
| `device_id` | (leave empty) | (will be filled automatically) |
| `user_id` | (leave empty) | (will be filled automatically) |

2. **Save Environment** and select it

## 🧪 **Testing Sequence**

### **Phase 1: Basic Health Check**

#### **1. Health Check**
- **Method**: `GET`
- **URL**: `{{base_url}}/health`
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "success": true,
  "message": "Smart Device Management Platform is running",
  "services": {
    "database": "connected",
    "redis": "connected",
    "websocket": "running"
  }
}
```

#### **2. Metrics Endpoint**
- **Method**: `GET`
- **URL**: `{{base_url}}/metrics`
- **Expected Status**: `200 OK`
- **Expected Response**: JSON with system metrics

---

### **Phase 2: Authentication Testing**

#### **3. User Registration**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/signup`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "SecurePass123",
  "role": "user"
}
```
- **Expected Status**: `201 Created`
- **Expected Response**:
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

#### **4. User Login**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "SecurePass123"
}
```
- **Expected Status**: `200 OK`
- **Expected Response**:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_here",
    "name": "Test User",
    "email": "test@example.com",
    "role": "user"
  }
}
```

**Important**: After login, the collection should automatically save the tokens to environment variables.

#### **5. Get User Profile**
- **Method**: `GET`
- **URL**: `{{base_url}}/auth/profile`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

#### **6. Update User Profile**
- **Method**: `PUT`
- **URL**: `{{base_url}}/auth/profile`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "name": "Updated Test User"
}
```
- **Expected Status**: `200 OK`

#### **7. Refresh Token**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "refreshToken": "{{refresh_token}}"
}
```
- **Expected Status**: `200 OK`

---

### **Phase 3: Device Management Testing**

#### **8. Create Device**
- **Method**: `POST`
- **URL**: `{{base_url}}/devices`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "name": "Living Room Light",
  "type": "light",
  "status": "active",
  "location": "Living Room",
  "description": "Smart LED light for testing"
}
```
- **Expected Status**: `201 Created`
- **Expected Response**:
```json
{
  "success": true,
  "device": {
    "id": "device_id_here",
    "name": "Living Room Light",
    "type": "light",
    "status": "active",
    "owner_id": "user_id_here"
  }
}
```

**Important**: Save the device ID from the response to use in subsequent tests.

#### **9. Get Devices (Test Caching)**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

**Check Response Headers**:
- `X-Cache: MISS` (first request)
- `X-Cache: HIT` (second request)
- `X-Response-Time: <100ms`

#### **10. Filter Devices**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices?type=light&status=active`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

#### **11. Update Device**
- **Method**: `PATCH`
- **URL**: `{{base_url}}/devices/{{device_id}}`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "name": "Updated Living Room Light",
  "status": "inactive"
}
```
- **Expected Status**: `200 OK`

#### **12. Device Heartbeat**
- **Method**: `POST`
- **URL**: `{{base_url}}/devices/{{device_id}}/heartbeat`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "status": "active"
}
```
- **Expected Status**: `200 OK`

---

### **Phase 4: Logs & Analytics Testing**

#### **13. Create Log Entry**
- **Method**: `POST`
- **URL**: `{{base_url}}/devices/{{device_id}}/logs`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "event": "units_consumed",
  "value": 2.5,
  "severity": "info",
  "source": "device"
}
```
- **Expected Status**: `201 Created`

#### **14. Get Device Logs (Test Caching)**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices/{{device_id}}/logs?limit=10`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

**Check Response Headers**:
- `X-Cache: MISS` (first request)
- `X-Cache: HIT` (second request)

#### **15. Get Usage Analytics (Test Caching)**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices/{{device_id}}/usage?range=24h`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

**Expected Response**:
```json
{
  "success": true,
  "device_id": "device_id_here",
  "range": "24h",
  "total_units": 15.7,
  "log_count": 24,
  "total_units_last_24h": 15.7
}
```

---

### **Phase 5: Data Export Testing**

#### **16. Create Export Job**
- **Method**: `POST`
- **URL**: `{{base_url}}/exports/jobs`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "type": "device-logs-csv",
  "options": {
    "deviceId": "{{device_id}}",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }
}
```
- **Expected Status**: `202 Accepted`
- **Expected Response**:
```json
{
  "success": true,
  "message": "Export job created successfully",
  "jobId": "job_id_here",
  "status": "pending"
}
```

**Important**: Save the job ID from the response.

#### **17. Check Export Job Status**
- **Method**: `GET`
- **URL**: `{{base_url}}/exports/jobs/{{job_id}}`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

**Expected Response** (after job completes):
```json
{
  "success": true,
  "jobId": "job_id_here",
  "type": "device-logs-csv",
  "status": "completed",
  "progress": 100,
  "result": {
    "fileName": "device-logs-123-2024-01-15.csv",
    "recordCount": 1500,
    "fileSize": 45000,
    "downloadUrl": "/exports/device-logs-123-2024-01-15.csv"
  }
}
```

#### **18. Get Export History**
- **Method**: `GET`
- **URL**: `{{base_url}}/exports/history`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`

#### **19. Download Export File**
- **Method**: `GET`
- **URL**: `{{base_url}}/exports/download/{{filename}}`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Expected Status**: `200 OK`
- **Response**: File download

---

### **Phase 6: Security & Error Testing**

#### **20. Test Rate Limiting**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "wrongpassword"
}
```
- **Repeat this request 6 times quickly**
- **Expected**: After 5 attempts, you should get rate limited

#### **21. Test Invalid Token**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices`
- **Headers**: `Authorization: Bearer invalid-token`
- **Expected Status**: `401 Unauthorized`

#### **22. Test Invalid Input**
- **Method**: `POST`
- **URL**: `{{base_url}}/devices`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "name": "",
  "type": "invalid_type"
}
```
- **Expected Status**: `400 Bad Request`

#### **23. Test Logout**
- **Method**: `POST`
- **URL**: `{{base_url}}/auth/logout`
- **Headers**: 
  - `Authorization: Bearer {{access_token}}`
  - `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "accessToken": "{{access_token}}",
  "refreshToken": "{{refresh_token}}"
}
```
- **Expected Status**: `200 OK`

---

### **Phase 7: Performance Testing**

#### **24. Test Response Times**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Check**: Response time should be <200ms

#### **25. Test Cache Performance**
- **Method**: `GET`
- **URL**: `{{base_url}}/devices`
- **Headers**: `Authorization: Bearer {{access_token}}`
- **Repeat**: Make the same request multiple times
- **Check**: Second request should be faster (cached)

---

## 📊 **Testing Checklist**

### **Basic Functionality**
- [ ] Health check responds correctly
- [ ] User registration works
- [ ] User login returns tokens
- [ ] Profile management works
- [ ] Refresh token works

### **Device Management**
- [ ] Device creation works
- [ ] Device listing works
- [ ] Device filtering works
- [ ] Device updates work
- [ ] Device heartbeat works

### **Caching**
- [ ] First request shows `X-Cache: MISS`
- [ ] Second request shows `X-Cache: HIT`
- [ ] Response times are fast (<100ms for cached)

### **Logs & Analytics**
- [ ] Log creation works
- [ ] Log retrieval works
- [ ] Analytics endpoint works
- [ ] Caching works for logs and analytics

### **Data Export**
- [ ] Export job creation works
- [ ] Job status tracking works
- [ ] Export history works
- [ ] File download works

### **Security**
- [ ] Rate limiting works
- [ ] Invalid token handling works
- [ ] Input validation works
- [ ] Logout works

### **Performance**
- [ ] Response times are acceptable
- [ ] Cache performance is good
- [ ] No memory leaks

---

## 🔍 **Monitoring During Tests**

### **Check Response Headers**
Look for these headers in responses:
- `X-Cache: HIT/MISS` - Shows if response was cached
- `X-Response-Time: <time>ms` - Shows response time
- `X-Cache-Key: <key>` - Shows cache key used

### **Check Application Logs**
Monitor your server console for:
- Cache hit/miss messages
- Performance metrics
- Error messages
- WebSocket connections

### **Check Database**
- MongoDB Express: http://localhost:8081
- Check if data is being created/updated

### **Check Cache**
- Redis Commander: http://localhost:8082
- Check if cache keys are being created

---

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Connection refused"**
   - Make sure your server is running
   - Check if port 3000 is available

2. **"401 Unauthorized"**
   - Check if access token is valid
   - Try logging in again

3. **"400 Bad Request"**
   - Check request body format
   - Verify all required fields

4. **"429 Too Many Requests"**
   - You've hit rate limiting
   - Wait a few minutes and try again

5. **Cache not working**
   - Check if Redis is running
   - Check server logs for Redis errors

---

## 🎯 **Next Steps**

After completing all tests:

1. **Run the automated test script**:
   ```bash
   ./test-all-features.sh
   ```

2. **Test WebSocket functionality**:
   - Open `websocket-test.html` in browser
   - Use the access token from Postman

3. **Run performance tests**:
   ```bash
   npm run performance:test
   ```

4. **Explore the application**:
   - Check MongoDB Express for data
   - Check Redis Commander for cache
   - Monitor server logs

---

**Happy Testing! 🚀**
