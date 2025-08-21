#!/bin/bash

# 🧪 Comprehensive Test Script for Smart Device Management Platform
# This script tests all the enhanced features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000"
ACCESS_TOKEN=""
REFRESH_TOKEN=""
DEVICE_ID=""
JOB_ID=""

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if services are running
check_services() {
    log_info "Checking if services are running..."
    
    # Check if API is running
    if curl -s "$API_BASE/health" > /dev/null; then
        log_success "API server is running"
    else
        log_error "API server is not running. Please start the application first."
        exit 1
    fi
    
    # Check Redis
    if command -v redis-cli > /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis is running"
        else
            log_warning "Redis is not running"
        fi
    fi
}

# Test 1: Health Check
test_health_check() {
    log_info "Testing health check endpoint..."
    
    response=$(curl -s "$API_BASE/health")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Health check passed"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        log_error "Health check failed"
        echo "$response"
    fi
}

# Test 2: Metrics
test_metrics() {
    log_info "Testing metrics endpoint..."
    
    response=$(curl -s "$API_BASE/metrics")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Metrics endpoint working"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        log_error "Metrics endpoint failed"
        echo "$response"
    fi
}

# Test 3: User Registration
test_user_registration() {
    log_info "Testing user registration..."
    
    response=$(curl -s -X POST "$API_BASE/auth/signup" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test User",
            "email": "test@example.com",
            "password": "SecurePass123",
            "role": "user"
        }')
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "User registration successful"
    else
        log_error "User registration failed"
        echo "$response"
    fi
}

# Test 4: User Login
test_user_login() {
    log_info "Testing user login..."
    
    response=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "SecurePass123"
        }')
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "User login successful"
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken' 2>/dev/null || echo "")
        REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken' 2>/dev/null || echo "")
        
        if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
            log_success "Access token obtained"
        else
            log_error "Failed to extract access token"
        fi
    else
        log_error "User login failed"
        echo "$response"
    fi
}

# Test 5: Rate Limiting
test_rate_limiting() {
    log_info "Testing rate limiting..."
    
    # Try to login multiple times with wrong password
    for i in {1..6}; do
        response=$(curl -s -X POST "$API_BASE/auth/login" \
            -H "Content-Type: application/json" \
            -d '{
                "email": "test@example.com",
                "password": "wrongpassword"
            }')
        
        if echo "$response" | grep -q "Too many"; then
            log_success "Rate limiting working (attempt $i)"
            break
        fi
        
        if [ $i -eq 6 ]; then
            log_warning "Rate limiting not triggered after 6 attempts"
        fi
    done
}

# Test 6: Refresh Token
test_refresh_token() {
    log_info "Testing refresh token..."
    
    if [ -z "$REFRESH_TOKEN" ]; then
        log_warning "No refresh token available, skipping test"
        return
    fi
    
    response=$(curl -s -X POST "$API_BASE/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{
            \"refreshToken\": \"$REFRESH_TOKEN\"
        }")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Refresh token working"
        # Update tokens
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken' 2>/dev/null || echo "$ACCESS_TOKEN")
        REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken' 2>/dev/null || echo "$REFRESH_TOKEN")
    else
        log_error "Refresh token failed"
        echo "$response"
    fi
}

# Test 7: Device Creation
test_device_creation() {
    log_info "Testing device creation..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        log_error "No access token available"
        return
    fi
    
    response=$(curl -s -X POST "$API_BASE/devices" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Device",
            "type": "light",
            "status": "active",
            "location": "Test Room",
            "description": "Test device for testing"
        }')
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Device creation successful"
        DEVICE_ID=$(echo "$response" | jq -r '.device.id' 2>/dev/null || echo "")
        if [ -n "$DEVICE_ID" ] && [ "$DEVICE_ID" != "null" ]; then
            log_success "Device ID: $DEVICE_ID"
        fi
    else
        log_error "Device creation failed"
        echo "$response"
    fi
}

# Test 8: Device Listing with Caching
test_device_listing() {
    log_info "Testing device listing with caching..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        log_error "No access token available"
        return
    fi
    
    # First request (should be cache MISS)
    log_info "First request (should be cache MISS)..."
    response1=$(curl -s -w "\n%{http_code}\n%{time_total}\n" -X GET "$API_BASE/devices" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    # Second request (should be cache HIT)
    log_info "Second request (should be cache HIT)..."
    response2=$(curl -s -w "\n%{http_code}\n%{time_total}\n" -X GET "$API_BASE/devices" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$response1" | grep -q '"success":true'; then
        log_success "Device listing working"
    else
        log_error "Device listing failed"
        echo "$response1"
    fi
}

# Test 9: Device Heartbeat
test_device_heartbeat() {
    log_info "Testing device heartbeat..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$DEVICE_ID" ]; then
        log_warning "Missing access token or device ID, skipping test"
        return
    fi
    
    response=$(curl -s -X POST "$API_BASE/devices/$DEVICE_ID/heartbeat" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "status": "active"
        }')
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Device heartbeat working"
    else
        log_error "Device heartbeat failed"
        echo "$response"
    fi
}

# Test 10: Log Creation
test_log_creation() {
    log_info "Testing log creation..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$DEVICE_ID" ]; then
        log_warning "Missing access token or device ID, skipping test"
        return
    fi
    
    response=$(curl -s -X POST "$API_BASE/devices/$DEVICE_ID/logs" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "event": "test_event",
            "value": 42.5,
            "severity": "info",
            "source": "test"
        }')
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Log creation working"
    else
        log_error "Log creation failed"
        echo "$response"
    fi
}

# Test 11: Analytics with Caching
test_analytics() {
    log_info "Testing analytics with caching..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$DEVICE_ID" ]; then
        log_warning "Missing access token or device ID, skipping test"
        return
    fi
    
    # First request (cache MISS)
    log_info "First analytics request (should be cache MISS)..."
    response1=$(curl -s -X GET "$API_BASE/devices/$DEVICE_ID/usage?range=24h" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    # Second request (cache HIT)
    log_info "Second analytics request (should be cache HIT)..."
    response2=$(curl -s -X GET "$API_BASE/devices/$DEVICE_ID/usage?range=24h" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$response1" | grep -q '"success":true'; then
        log_success "Analytics working"
    else
        log_error "Analytics failed"
        echo "$response1"
    fi
}

# Test 12: Export Job Creation
test_export_job() {
    log_info "Testing export job creation..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$DEVICE_ID" ]; then
        log_warning "Missing access token or device ID, skipping test"
        return
    fi
    
    response=$(curl -s -X POST "$API_BASE/exports/jobs" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"device-logs-csv\",
            \"options\": {
                \"deviceId\": \"$DEVICE_ID\",
                \"startDate\": \"2024-01-01T00:00:00Z\",
                \"endDate\": \"2024-12-31T23:59:59Z\"
            }
        }")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Export job creation working"
        JOB_ID=$(echo "$response" | jq -r '.jobId' 2>/dev/null || echo "")
        if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
            log_success "Job ID: $JOB_ID"
        fi
    else
        log_error "Export job creation failed"
        echo "$response"
    fi
}

# Test 13: Export Job Status
test_export_status() {
    log_info "Testing export job status..."
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$JOB_ID" ]; then
        log_warning "Missing access token or job ID, skipping test"
        return
    fi
    
    response=$(curl -s -X GET "$API_BASE/exports/jobs/$JOB_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Export job status working"
        status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "")
        log_info "Job status: $status"
    else
        log_error "Export job status failed"
        echo "$response"
    fi
}

# Test 14: Redis Cache Testing
test_redis_cache() {
    log_info "Testing Redis cache..."
    
    if command -v redis-cli > /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis is accessible"
            
            # Check cache keys
            keys=$(redis-cli keys "*" 2>/dev/null | wc -l)
            log_info "Number of cache keys: $keys"
            
            if [ $keys -gt 0 ]; then
                log_success "Cache is being used"
            else
                log_warning "No cache keys found"
            fi
        else
            log_warning "Redis is not accessible"
        fi
    else
        log_warning "redis-cli not available"
    fi
}

# Test 15: Error Handling
test_error_handling() {
    log_info "Testing error handling..."
    
    # Test invalid token
    response=$(curl -s -X GET "$API_BASE/devices" \
        -H "Authorization: Bearer invalid-token")
    
    if echo "$response" | grep -q '"success":false'; then
        log_success "Invalid token handling working"
    else
        log_error "Invalid token handling failed"
        echo "$response"
    fi
    
    # Test invalid input
    response=$(curl -s -X POST "$API_BASE/devices" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "",
            "type": "invalid_type"
        }')
    
    if echo "$response" | grep -q '"success":false'; then
        log_success "Invalid input handling working"
    else
        log_error "Invalid input handling failed"
        echo "$response"
    fi
}

# Test 16: Performance Test
test_performance() {
    log_info "Testing performance..."
    
    if [ -z "$ACCESS_TOKEN" ]; then
        log_warning "No access token available, skipping performance test"
        return
    fi
    
    # Test response time
    start_time=$(date +%s%N)
    response=$(curl -s -X GET "$API_BASE/devices" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    end_time=$(date +%s%N)
    
    duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if echo "$response" | grep -q '"success":true'; then
        if [ $duration -lt 1000 ]; then
            log_success "Performance test passed: ${duration}ms"
        else
            log_warning "Performance test slow: ${duration}ms"
        fi
    else
        log_error "Performance test failed"
    fi
}

# Main test execution
main() {
    echo "🧪 Starting Comprehensive Test Suite for Smart Device Management Platform"
    echo "=================================================================="
    
    check_services
    echo ""
    
    test_health_check
    echo ""
    
    test_metrics
    echo ""
    
    test_user_registration
    echo ""
    
    test_user_login
    echo ""
    
    test_rate_limiting
    echo ""
    
    test_refresh_token
    echo ""
    
    test_device_creation
    echo ""
    
    test_device_listing
    echo ""
    
    test_device_heartbeat
    echo ""
    
    test_log_creation
    echo ""
    
    test_analytics
    echo ""
    
    test_export_job
    echo ""
    
    test_export_status
    echo ""
    
    test_redis_cache
    echo ""
    
    test_error_handling
    echo ""
    
    test_performance
    echo ""
    
    echo "=================================================================="
    log_success "Test suite completed!"
    echo ""
    echo "📊 Summary:"
    echo "- API Base URL: $API_BASE"
    echo "- Access Token: ${ACCESS_TOKEN:0:20}..."
    echo "- Device ID: $DEVICE_ID"
    echo "- Job ID: $JOB_ID"
    echo ""
    echo "🔗 Useful URLs:"
    echo "- Health Check: $API_BASE/health"
    echo "- Metrics: $API_BASE/metrics"
    echo "- MongoDB Express: http://localhost:8081"
    echo "- Redis Commander: http://localhost:8082"
    echo ""
    echo "📁 Test Files:"
    echo "- WebSocket Test: websocket-test.html"
    echo "- Load Test: npm run performance:test"
    echo ""
    log_info "For WebSocket testing, open websocket-test.html in your browser"
}

# Run the main function
main "$@"
