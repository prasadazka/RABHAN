# Test Cases - Authentication Service

## Service Overview
**Service**: Authentication Service  
**Port**: 3001  
**Technology**: Node.js/TypeScript  
**Database**: PostgreSQL (rabhan_auth)  
**External APIs**: Twilio (SMS), SendGrid (Email)

---

## TC-AUTH-001: User Registration

### TC-AUTH-001-001: Successful User Registration
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "email": "testuser@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phone": "+966501234567",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "userType": "HOMEOWNER"
}
```

**Steps**:
1. Send POST request to `/api/auth/register`
2. Verify response status is 201
3. Verify user created in database
4. Verify password is hashed (not plaintext)
5. Verify verification email sent
6. Verify SMS verification code sent

**Expected Results**:
- User account created successfully
- Password encrypted with bcrypt
- Email verification sent via SendGrid
- SMS verification code sent via Twilio
- User status set to 'PENDING_VERIFICATION'

### TC-AUTH-001-002: Registration with Duplicate Email
**Priority**: High  
**Type**: Negative Test  

**Pre-condition**: User with email already exists

**Steps**:
1. Send POST request with existing email
2. Verify response status is 409
3. Verify error message indicates duplicate email

**Expected Results**:
- Registration rejected
- Error: "Email already registered"
- No duplicate user created

### TC-AUTH-001-003: Registration with Invalid Phone Format
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```json
{
  "phone": "invalid-phone-123"
}
```

**Steps**:
1. Send POST request with invalid phone
2. Verify response status is 400
3. Verify validation error returned

**Expected Results**:
- Registration rejected
- Error: "Invalid phone number format"

### TC-AUTH-001-004: Registration with Weak Password
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "password": "weak"
}
```

**Steps**:
1. Send POST request with weak password
2. Verify response status is 400
3. Verify password complexity error

**Expected Results**:
- Registration rejected
- Error: Password complexity requirements not met

---

## TC-AUTH-002: User Login

### TC-AUTH-002-001: Successful Login with Email
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Verified user exists

**Test Data**:
```json
{
  "email": "verified@example.com",
  "password": "SecurePass123!"
}
```

**Steps**:
1. Send POST request to `/api/auth/login`
2. Verify response status is 200
3. Verify JWT token returned
4. Verify token contains correct user data
5. Verify last_login_at updated

**Expected Results**:
- Login successful
- Valid JWT token returned
- Token expires in 24 hours
- User session created
- Last login timestamp updated

### TC-AUTH-002-002: Login with Invalid Credentials
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "email": "user@example.com",
  "password": "wrongpassword"
}
```

**Steps**:
1. Send POST request with wrong password
2. Verify response status is 401
3. Verify no token returned
4. Verify security event logged

**Expected Results**:
- Login rejected
- Error: "Invalid credentials"
- No JWT token issued
- Failed login attempt logged

### TC-AUTH-002-003: Login with Unverified Account
**Priority**: Medium  
**Type**: Negative Test  

**Pre-condition**: User registered but not verified

**Steps**:
1. Send login request for unverified user
2. Verify response status is 403
3. Verify appropriate error message

**Expected Results**:
- Login rejected
- Error: "Please verify your email/phone first"

---

## TC-AUTH-003: Phone Verification

### TC-AUTH-003-001: Send SMS Verification Code
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "phone": "+966501234567"
}
```

**Steps**:
1. Send POST request to `/api/auth/send-phone-verification`
2. Verify response status is 200
3. Verify SMS sent via Twilio
4. Verify verification code stored in Redis
5. Verify code expires in 5 minutes

**Expected Results**:
- SMS verification code sent
- Code stored in Redis with expiration
- Success message returned

### TC-AUTH-003-002: Verify SMS Code Successfully
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: SMS code sent and stored

**Test Data**:
```json
{
  "phone": "+966501234567",
  "code": "123456"
}
```

**Steps**:
1. Send POST request to `/api/auth/verify-phone`
2. Verify response status is 200
3. Verify phone_verified set to true
4. Verify verification code removed from Redis

**Expected Results**:
- Phone verification successful
- User phone_verified flag updated
- Verification code cleaned up

### TC-AUTH-003-003: Verify with Invalid SMS Code
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "phone": "+966501234567",
  "code": "999999"
}
```

**Steps**:
1. Send POST request with wrong code
2. Verify response status is 400
3. Verify phone_verified remains false

**Expected Results**:
- Verification rejected
- Error: "Invalid verification code"

### TC-AUTH-003-004: Verify with Expired SMS Code
**Priority**: Medium  
**Type**: Negative Test  

**Pre-condition**: SMS code expired (>5 minutes old)

**Steps**:
1. Wait for code expiration
2. Send verification request
3. Verify response status is 400

**Expected Results**:
- Verification rejected
- Error: "Verification code expired"

---

## TC-AUTH-004: Email Verification

### TC-AUTH-004-001: Send Email Verification
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "email": "user@example.com"
}
```

**Steps**:
1. Send POST request to `/api/auth/send-email-verification`
2. Verify response status is 200
3. Verify email sent via SendGrid
4. Verify verification token generated
5. Verify token stored with expiration

**Expected Results**:
- Verification email sent
- Unique verification token created
- Token valid for 24 hours

### TC-AUTH-004-002: Verify Email with Valid Token
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Email verification sent

**Steps**:
1. Extract token from verification email
2. Send GET request to `/api/auth/verify-email/{token}`
3. Verify response status is 200
4. Verify email_verified set to true

**Expected Results**:
- Email verification successful
- User email_verified flag updated
- Verification token invalidated

### TC-AUTH-004-003: Verify with Invalid Token
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```
Token: "invalid-token-123"
```

**Steps**:
1. Send GET request with invalid token
2. Verify response status is 400
3. Verify email_verified remains false

**Expected Results**:
- Verification rejected
- Error: "Invalid or expired token"

---

## TC-AUTH-005: JWT Token Management

### TC-AUTH-005-001: Generate Valid JWT Token
**Priority**: High  
**Type**: Positive Test  

**Steps**:
1. Perform successful login
2. Extract JWT token from response
3. Decode token payload
4. Verify token contains userId, email, role
5. Verify token signature is valid
6. Verify expiration time is set

**Expected Results**:
- Valid JWT token generated
- Contains required user claims
- Properly signed and timestamped
- Expires in 24 hours

### TC-AUTH-005-002: Validate JWT Token
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Valid JWT token available

**Steps**:
1. Send GET request to `/api/auth/validate-token`
2. Include JWT token in Authorization header
3. Verify response status is 200
4. Verify token validation successful

**Expected Results**:
- Token validated successfully
- User information returned
- Token remains valid

### TC-AUTH-005-003: Reject Expired JWT Token
**Priority**: High  
**Type**: Negative Test  

**Pre-condition**: Expired JWT token

**Steps**:
1. Use expired JWT token in request
2. Send request to protected endpoint
3. Verify response status is 401
4. Verify token rejection message

**Expected Results**:
- Token rejected
- Error: "Token expired"
- Access denied

### TC-AUTH-005-004: Reject Malformed JWT Token
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```
Token: "malformed.jwt.token"
```

**Steps**:
1. Send request with malformed token
2. Verify response status is 401
3. Verify token format error

**Expected Results**:
- Token rejected
- Error: "Invalid token format"

---

## TC-AUTH-006: Password Management

### TC-AUTH-006-001: Change Password Successfully
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Authenticated user

**Test Data**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Steps**:
1. Send POST request to `/api/auth/change-password`
2. Verify response status is 200
3. Verify password hash updated in database
4. Verify old password no longer works
5. Verify new password works for login

**Expected Results**:
- Password changed successfully
- New password hash stored
- Old password invalidated
- Login works with new password

### TC-AUTH-006-002: Change Password with Wrong Current Password
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "currentPassword": "WrongPassword",
  "newPassword": "NewPassword123!"
}
```

**Steps**:
1. Send request with incorrect current password
2. Verify response status is 400
3. Verify password not changed

**Expected Results**:
- Password change rejected
- Error: "Current password incorrect"
- Original password remains valid

### TC-AUTH-006-003: Reset Password Request
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "email": "user@example.com"
}
```

**Steps**:
1. Send POST request to `/api/auth/reset-password-request`
2. Verify response status is 200
3. Verify reset email sent via SendGrid
4. Verify reset token generated and stored

**Expected Results**:
- Password reset email sent
- Reset token created with 1-hour expiration
- Security event logged

### TC-AUTH-006-004: Reset Password with Valid Token
**Priority**: Medium  
**Type**: Positive Test  

**Pre-condition**: Password reset token generated

**Test Data**:
```json
{
  "token": "valid-reset-token",
  "newPassword": "ResetPassword123!"
}
```

**Steps**:
1. Send POST request to `/api/auth/reset-password`
2. Verify response status is 200
3. Verify password hash updated
4. Verify reset token invalidated
5. Verify login works with new password

**Expected Results**:
- Password reset successful
- New password hash stored
- Reset token consumed
- User can login with new password

---

## TC-AUTH-007: Role-Based Access Control

### TC-AUTH-007-001: User Role Access Control
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User with HOMEOWNER role

**Steps**:
1. Login as HOMEOWNER user
2. Send request to user-only endpoint
3. Verify access granted
4. Send request to admin-only endpoint
5. Verify access denied

**Expected Results**:
- User endpoints accessible
- Admin endpoints blocked
- Proper role enforcement

### TC-AUTH-007-002: Admin Role Access Control
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User with ADMIN role

**Steps**:
1. Login as ADMIN user
2. Send request to admin endpoint
3. Verify access granted
4. Send request to user endpoint
5. Verify access granted

**Expected Results**:
- Admin has access to all endpoints
- Role hierarchy respected

### TC-AUTH-007-003: Contractor Role Access Control
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User with CONTRACTOR role

**Steps**:
1. Login as CONTRACTOR user
2. Send request to contractor endpoint
3. Verify access granted
4. Send request to admin endpoint
5. Verify access denied

**Expected Results**:
- Contractor endpoints accessible
- Admin endpoints blocked
- Role permissions enforced

---

## TC-AUTH-008: Rate Limiting and Security

### TC-AUTH-008-001: Rate Limiting on Login Attempts
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Send 5 failed login attempts rapidly
2. Verify rate limiting kicks in
3. Verify response status is 429
4. Wait for rate limit reset
5. Verify login possible again

**Expected Results**:
- Rate limiting prevents brute force
- Temporary lockout after 5 attempts
- Reset after configured time period

### TC-AUTH-008-002: SQL Injection Prevention
**Priority**: High  
**Type**: Security Test  

**Test Data**:
```json
{
  "email": "'; DROP TABLE users; --",
  "password": "password"
}
```

**Steps**:
1. Send login request with SQL injection payload
2. Verify response status is 400 or 401
3. Verify database tables intact
4. Verify no SQL injection executed

**Expected Results**:
- SQL injection prevented
- Malicious payload sanitized
- Database integrity maintained

### TC-AUTH-008-003: XSS Prevention in Registration
**Priority**: Medium  
**Type**: Security Test  

**Test Data**:
```json
{
  "firstName": "<script>alert('xss')</script>",
  "email": "test@example.com"
}
```

**Steps**:
1. Send registration with XSS payload
2. Verify response sanitized
3. Verify script tags not stored
4. Verify no XSS execution

**Expected Results**:
- XSS payload sanitized
- Malicious scripts removed
- Safe data stored

---

## TC-AUTH-009: Session Management

### TC-AUTH-009-001: Session Creation on Login
**Priority**: Medium  
**Type**: Positive Test  

**Steps**:
1. Perform successful login
2. Verify session created in Redis
3. Verify session contains user data
4. Verify session expiration set

**Expected Results**:
- Session stored in Redis
- Session data includes user ID, role
- Proper expiration time set

### TC-AUTH-009-002: Session Cleanup on Logout
**Priority**: Medium  
**Type**: Positive Test  

**Pre-condition**: Active user session

**Steps**:
1. Send POST request to `/api/auth/logout`
2. Verify response status is 200
3. Verify session removed from Redis
4. Verify JWT token invalidated

**Expected Results**:
- Logout successful
- Session cleaned up
- Token no longer valid

### TC-AUTH-009-003: Session Timeout Handling
**Priority**: Medium  
**Type**: Positive Test  

**Pre-condition**: Session near expiration

**Steps**:
1. Wait for session to expire
2. Send request with expired session
3. Verify response status is 401
4. Verify session cleanup

**Expected Results**:
- Expired session rejected
- User required to re-authenticate
- Automatic session cleanup

---

## TC-AUTH-010: Integration Tests

### TC-AUTH-010-001: Database Connection and Operations
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Verify database connection established
2. Test user creation operation
3. Test user retrieval operation
4. Test user update operation
5. Verify database transactions

**Expected Results**:
- Database operations successful
- Data integrity maintained
- Transactions committed properly

### TC-AUTH-010-002: Twilio SMS Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Send SMS verification request
2. Verify Twilio API called
3. Verify SMS delivery status
4. Handle Twilio API failures gracefully

**Expected Results**:
- SMS sent via Twilio
- Delivery confirmation received
- Error handling for API failures

### TC-AUTH-010-003: SendGrid Email Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Send email verification request
2. Verify SendGrid API called
3. Verify email delivery status
4. Handle SendGrid API failures

**Expected Results**:
- Email sent via SendGrid
- Delivery confirmation received
- Graceful error handling

---

## Performance Test Cases

### TC-AUTH-PERF-001: Login Response Time
**Priority**: High  
**Target**: < 500ms response time

**Steps**:
1. Execute 100 concurrent login requests
2. Measure response times
3. Verify 95th percentile < 500ms
4. Monitor database performance

**Expected Results**:
- Fast login response times
- System handles concurrent logins
- No performance degradation

### TC-AUTH-PERF-002: JWT Token Generation Speed
**Priority**: Medium  
**Target**: < 50ms token generation

**Steps**:
1. Generate 1000 JWT tokens
2. Measure generation time
3. Verify average < 50ms
4. Monitor memory usage

**Expected Results**:
- Fast token generation
- Efficient memory usage
- No memory leaks

---

## Test Data Requirements

### Valid Test Users
```json
[
  {
    "email": "admin@rabhan.test",
    "role": "ADMIN",
    "phone": "+966501234567",
    "status": "VERIFIED"
  },
  {
    "email": "user@rabhan.test", 
    "role": "HOMEOWNER",
    "phone": "+966501234568",
    "status": "VERIFIED"
  },
  {
    "email": "contractor@rabhan.test",
    "role": "CONTRACTOR", 
    "phone": "+966501234569",
    "status": "VERIFIED"
  }
]
```

### Test Environment Configuration
- **Test Database**: rabhan_auth_test
- **Redis Instance**: Separate test Redis
- **Twilio**: Test credentials/sandbox
- **SendGrid**: Test API key
- **JWT Secret**: Test-specific secret key

---

**Total Test Cases**: 33
**High Priority**: 18
**Medium Priority**: 12  
**Low Priority**: 3