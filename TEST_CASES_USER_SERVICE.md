# Test Cases - User Service

## Service Overview
**Service**: User Service  
**Port**: 3002  
**Technology**: Node.js/TypeScript  
**Database**: PostgreSQL (rabhan_profiles)  
**Dependencies**: Auth Service, Document Service

---

## TC-USER-001: User Profile Creation

### TC-USER-001-001: Create Complete User Profile
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "userId": "auth-user-id-123",
  "region": "Riyadh",
  "city": "Riyadh",
  "district": "Al Olaya",
  "streetAddress": "King Fahd Road",
  "postalCode": "12211",
  "propertyType": "VILLA",
  "propertyOwnership": "OWNED",
  "roofSize": 200.5,
  "gpsLatitude": 24.7136,
  "gpsLongitude": 46.6753,
  "electricityConsumption": "1500-2000",
  "electricityMeterNumber": "12345678",
  "preferredLanguage": "ar",
  "employmentStatus": "employed",
  "employerName": "ARAMCO",
  "jobTitle": "Engineer",
  "monthlyIncome": 15000,
  "yearsEmployed": 5,
  "desiredSystemSize": 10.5,
  "budgetRange": "25K_50K"
}
```

**Steps**:
1. Send POST request to `/api/profiles`
2. Verify response status is 201
3. Verify profile created in database
4. Verify profile completion percentage calculated
5. Verify audit log entry created

**Expected Results**:
- User profile created successfully
- Profile completion calculated correctly (should be high %)
- All fields stored with correct data types
- Audit trail logged

### TC-USER-001-002: Create Profile with Missing Required Fields
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "userId": "auth-user-id-123"
  // Missing required fields like region, city
}
```

**Steps**:
1. Send POST request with incomplete data
2. Verify response status is 400
3. Verify validation errors returned
4. Verify no profile created

**Expected Results**:
- Profile creation rejected
- Validation errors for missing required fields
- No incomplete profile stored

### TC-USER-001-003: Create Duplicate Profile
**Priority**: Medium  
**Type**: Negative Test  

**Pre-condition**: Profile already exists for user

**Steps**:
1. Send POST request for existing user
2. Verify response status is 409
3. Verify conflict error message
4. Verify original profile unchanged

**Expected Results**:
- Duplicate creation prevented
- Error: "User profile already exists"
- Original profile data intact

---

## TC-USER-002: Profile Retrieval

### TC-USER-002-001: Get Profile by User ID
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User profile exists

**Steps**:
1. Send GET request to `/api/profiles/{userId}`
2. Verify response status is 200
3. Verify complete profile data returned
4. Verify profile completion percentage included

**Expected Results**:
- Profile data retrieved successfully
- All fields populated correctly
- Profile completion percentage accurate

### TC-USER-002-002: Get Current User Profile
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Authenticated user with profile

**Steps**:
1. Send GET request to `/api/profiles/me`
2. Include JWT token in headers
3. Verify response status is 200
4. Verify user's own profile returned

**Expected Results**:
- Current user profile returned
- Authentication validated
- Correct profile data displayed

### TC-USER-002-003: Get Non-existent Profile
**Priority**: Medium  
**Type**: Negative Test  

**Steps**:
1. Send GET request for non-existent user
2. Verify response status is 404
3. Verify appropriate error message

**Expected Results**:
- Profile not found error
- Error: "User profile not found"

---

## TC-USER-003: Profile Updates

### TC-USER-003-001: Update Profile Successfully
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User profile exists

**Test Data**:
```json
{
  "city": "Jeddah",
  "monthlyIncome": 18000,
  "desiredSystemSize": 12.0,
  "budgetRange": "50K_100K"
}
```

**Steps**:
1. Send PUT request to `/api/profiles/me`
2. Verify response status is 200
3. Verify updated fields in database
4. Verify profile completion recalculated
5. Verify audit log updated

**Expected Results**:
- Profile updated successfully
- Only specified fields changed
- Profile completion percentage updated
- Change history logged

### TC-USER-003-002: Update with Invalid Data Types
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "monthlyIncome": "not-a-number",
  "roofSize": -50,
  "gpsLatitude": 200
}
```

**Steps**:
1. Send PUT request with invalid data
2. Verify response status is 400
3. Verify validation errors returned
4. Verify profile not updated

**Expected Results**:
- Update rejected
- Validation errors for each invalid field
- Original profile data preserved

### TC-USER-003-003: Partial Profile Update
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "preferredLanguage": "en",
  "emailNotifications": false
}
```

**Steps**:
1. Send PUT request with only 2 fields
2. Verify response status is 200
3. Verify only specified fields updated
4. Verify other fields unchanged

**Expected Results**:
- Partial update successful
- Only modified fields changed
- Other profile data unchanged

---

## TC-USER-004: BNPL Eligibility

### TC-USER-004-001: Check BNPL Eligibility - Eligible User
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User with high income, good profile completion

**Steps**:
1. Send GET request to `/api/profiles/me/bnpl-eligibility`
2. Verify response status is 200
3. Verify eligibility calculation correct
4. Verify max amount calculated
5. Verify risk score provided

**Expected Results**:
- BNPL eligibility calculated correctly
- Maximum amount determined based on income
- Risk score within acceptable range
- Eligibility criteria clearly stated

### TC-USER-004-002: Check BNPL Eligibility - Ineligible User
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User with low income or incomplete profile

**Steps**:
1. Send GET request for ineligible user
2. Verify response status is 200
3. Verify eligible flag is false
4. Verify reason provided for ineligibility

**Expected Results**:
- BNPL eligibility denied
- Clear reason for rejection provided
- Max amount set to 0
- Helpful guidance for improving eligibility

### TC-USER-004-003: BNPL Eligibility Calculation Algorithm
**Priority**: High  
**Type**: Business Logic Test  

**Test Scenarios**:
```json
[
  {
    "monthlyIncome": 5000,
    "yearsEmployed": 1,
    "profileCompletion": 60,
    "expectedEligible": false
  },
  {
    "monthlyIncome": 15000,
    "yearsEmployed": 3,
    "profileCompletion": 90,
    "expectedEligible": true,
    "expectedMaxAmount": 75000
  },
  {
    "monthlyIncome": 25000,
    "yearsEmployed": 5,
    "profileCompletion": 100,
    "expectedEligible": true,
    "expectedMaxAmount": 125000
  }
]
```

**Steps**:
1. Test each scenario
2. Verify eligibility matches expected
3. Verify max amount calculations
4. Verify risk score calculations

**Expected Results**:
- Algorithm produces consistent results
- Income-to-debt ratios respected
- Profile completion impacts eligibility
- Employment stability considered

---

## TC-USER-005: Document Integration

### TC-USER-005-001: Get User Documents
**Priority**: High  
**Type**: Integration Test  

**Pre-condition**: User has uploaded documents

**Steps**:
1. Send GET request to `/api/profiles/me/documents`
2. Verify response status is 200
3. Verify documents list returned
4. Verify document metadata included

**Expected Results**:
- User documents retrieved from Document Service
- Document types and statuses correct
- Upload dates and verification status shown

### TC-USER-005-002: Document Status Impact on Profile
**Priority**: Medium  
**Type**: Integration Test  

**Steps**:
1. Upload required documents
2. Check profile completion percentage
3. Get documents approved by admin
4. Verify profile completion updated

**Expected Results**:
- Document uploads increase profile completion
- Approved documents boost completion score
- Profile verification status updated

---

## TC-USER-006: Profile Completion Calculation

### TC-USER-006-001: Profile Completion Algorithm
**Priority**: High  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "basicInfo": {
    "region": "Riyadh",
    "city": "Riyadh", 
    "streetAddress": "123 Main St"
  },
  "propertyInfo": {
    "propertyType": "VILLA",
    "roofSize": 200
  },
  "contactInfo": {
    "phone": "+966501234567",
    "preferredLanguage": "ar"
  },
  "employmentInfo": null,
  "solarPreferences": null
}
```

**Steps**:
1. Create profile with partial data
2. Calculate completion percentage
3. Verify calculation methodology
4. Add more fields and recalculate

**Expected Results**:
- Completion percentage calculated correctly
- Each section weighted appropriately
- Algorithm consistent and predictable

### TC-USER-006-002: Profile Completion Threshold
**Priority**: Medium  
**Type**: Business Logic Test  

**Steps**:
1. Create profile with exactly 80% completion
2. Verify profileCompleted flag is true
3. Reduce to 79% completion
4. Verify profileCompleted flag is false

**Expected Results**:
- 80% threshold enforced correctly
- Boolean flag updates automatically
- Completion status accurate

---

## TC-USER-007: User Analytics (Admin)

### TC-USER-007-001: Get All Users for Admin
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Multiple users exist, admin authenticated

**Steps**:
1. Send GET request to `/api/admin/users`
2. Verify response status is 200
3. Verify paginated results returned
4. Verify combined auth + profile data
5. Verify filtering and sorting work

**Expected Results**:
- All users retrieved with pagination
- Combined data from auth and user services
- Filtering by verification status works
- Sorting options functional

### TC-USER-007-002: User Analytics and KPIs
**Priority**: High  
**Type**: Positive Test  

**Steps**:
1. Send GET request to `/api/admin/analytics`
2. Verify response status is 200
3. Verify comprehensive analytics returned
4. Verify calculation accuracy

**Expected Analytics**:
- Total users count
- User growth metrics (this/last month)
- Profile completion statistics
- Verification status breakdown
- BNPL eligibility metrics
- Geographic distribution
- Property type distribution
- User activity metrics

**Expected Results**:
- All analytics calculated correctly
- Performance within acceptable limits
- Data aggregation accurate

### TC-USER-007-003: Geographic Analytics Accuracy
**Priority**: Medium  
**Type**: Business Logic Test  

**Steps**:
1. Create users in different regions/cities
2. Request analytics
3. Verify geographic distribution correct
4. Verify percentages sum to 100%

**Expected Results**:
- Geographic data aggregated correctly
- Top regions/cities identified accurately
- Percentage calculations correct

---

## TC-USER-008: Verification Status Management

### TC-USER-008-001: Update User Verification Status (Admin)
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Admin authenticated, user exists

**Test Data**:
```json
{
  "status": "verified",
  "notes": "All documents reviewed and approved"
}
```

**Steps**:
1. Send PUT request to `/api/profiles/{userId}/verification-status`
2. Verify response status is 200
3. Verify user verification status updated
4. Verify audit log entry created

**Expected Results**:
- Verification status updated successfully
- Status change logged with admin ID
- User profile reflects new status

### TC-USER-008-002: Invalid Status Transition
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```json
{
  "status": "invalid_status"
}
```

**Steps**:
1. Send PUT request with invalid status
2. Verify response status is 400
3. Verify status not changed
4. Verify error message returned

**Expected Results**:
- Invalid status rejected
- Error message lists valid statuses
- Original status preserved

---

## TC-USER-009: Search and Filtering

### TC-USER-009-001: Search Users by Criteria
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "region": "Riyadh",
  "verificationStatus": "verified",
  "bnplEligible": true
}
```

**Steps**:
1. Send GET request to `/api/profiles/search`
2. Include search criteria in query params
3. Verify response status is 200
4. Verify results match criteria

**Expected Results**:
- Search returns matching users only
- Multiple criteria combined with AND logic
- Results paginated properly

### TC-USER-009-002: Search Performance with Large Dataset
**Priority**: Medium  
**Type**: Performance Test  

**Pre-condition**: Database with 10,000+ users

**Steps**:
1. Execute complex search query
2. Measure response time
3. Verify results accuracy
4. Monitor database performance

**Expected Results**:
- Search completes within 2 seconds
- Results accurate and complete
- Database indexes utilized effectively

---

## TC-USER-010: Data Validation

### TC-USER-010-001: GPS Coordinates Validation
**Priority**: Medium  
**Type**: Validation Test  

**Test Data**:
```json
[
  {"gpsLatitude": 24.7136, "gpsLongitude": 46.6753, "valid": true},
  {"gpsLatitude": 200, "gpsLongitude": 46.6753, "valid": false},
  {"gpsLatitude": 24.7136, "gpsLongitude": -200, "valid": false}
]
```

**Steps**:
1. Test each coordinate pair
2. Verify validation results match expected
3. Verify appropriate error messages

**Expected Results**:
- Valid coordinates accepted
- Invalid coordinates rejected with clear errors
- Proper latitude/longitude ranges enforced

### TC-USER-010-002: Enum Value Validation
**Priority**: Medium  
**Type**: Validation Test  

**Test Cases**:
- Property Type: VILLA, APARTMENT, TOWNHOUSE, etc.
- Property Ownership: OWNED, RENTED, LEASED, FAMILY_OWNED
- Budget Range: UNDER_10K, 10K_25K, 25K_50K, etc.

**Steps**:
1. Test valid enum values
2. Test invalid enum values  
3. Verify case sensitivity
4. Verify error messages

**Expected Results**:
- Valid enums accepted
- Invalid enums rejected
- Clear validation messages provided

---

## TC-USER-011: Error Handling

### TC-USER-011-001: Database Connection Error
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate database disconnection
2. Send profile request
3. Verify graceful error handling
4. Verify appropriate error message
5. Verify service recovery

**Expected Results**:
- Service handles database errors gracefully
- Meaningful error messages returned
- Service recovers when database available

### TC-USER-011-002: External Service Dependency Error
**Priority**: Medium  
**Type**: Error Handling Test  

**Steps**:
1. Simulate Document Service unavailable
2. Request user documents
3. Verify fallback behavior
4. Verify error logging

**Expected Results**:
- Graceful degradation when dependencies fail
- Appropriate fallback responses
- Errors logged for monitoring

---

## TC-USER-012: Security Tests

### TC-USER-012-001: Authorization Enforcement
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Attempt to access another user's profile
2. Verify access denied
3. Attempt admin operations without admin role
4. Verify authorization checks

**Expected Results**:
- Users can only access their own data
- Admin operations require admin role
- Authorization properly enforced

### TC-USER-012-002: Input Sanitization
**Priority**: High  
**Type**: Security Test  

**Test Data**:
```json
{
  "city": "<script>alert('xss')</script>",
  "streetAddress": "'; DROP TABLE users; --"
}
```

**Steps**:
1. Send profile update with malicious input
2. Verify input sanitized
3. Verify no XSS or SQL injection
4. Verify safe data stored

**Expected Results**:
- Malicious input neutralized
- XSS attempts prevented
- SQL injection blocked
- Safe data stored in database

---

## Integration Test Cases

### TC-USER-INT-001: Auth Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Create user in Auth Service
2. Create profile in User Service
3. Verify user ID linking correct
4. Test profile access with JWT token

**Expected Results**:
- Services properly integrated
- User ID references maintained
- Authentication works across services

### TC-USER-INT-002: Document Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Upload documents via Document Service
2. Check profile completion update
3. Verify document status synchronization
4. Test document verification workflow

**Expected Results**:
- Document uploads update profile completion
- Status changes synchronized correctly
- Verification workflow functions properly

---

## Performance Test Cases

### TC-USER-PERF-001: Profile CRUD Operations
**Priority**: High  
**Target**: < 100ms response time

**Steps**:
1. Execute 1000 profile create operations
2. Execute 1000 profile read operations  
3. Execute 1000 profile update operations
4. Measure average response times

**Expected Results**:
- Average response time < 100ms
- 95th percentile < 200ms
- System handles concurrent operations

### TC-USER-PERF-002: Analytics Generation Performance
**Priority**: Medium  
**Target**: < 2 seconds for 10,000+ users

**Steps**:
1. Generate analytics for large user base
2. Measure generation time
3. Monitor database query performance
4. Verify memory usage

**Expected Results**:
- Analytics generated within 2 seconds
- Database queries optimized
- Reasonable memory consumption

---

## Test Data Requirements

### Test Users Profile Data
```json
[
  {
    "userId": "test-user-1",
    "region": "Riyadh",
    "city": "Riyadh",
    "propertyType": "VILLA",
    "monthlyIncome": 15000,
    "profileCompleted": true,
    "verificationStatus": "verified"
  },
  {
    "userId": "test-user-2", 
    "region": "Jeddah",
    "city": "Jeddah",
    "propertyType": "APARTMENT",
    "monthlyIncome": 8000,
    "profileCompleted": false,
    "verificationStatus": "pending"
  }
]
```

### Test Environment Setup
- **Database**: rabhan_profiles_test
- **Auth Service Mock**: Mock JWT validation
- **Document Service Mock**: Mock document endpoints
- **Test Data**: 1000+ sample profiles for performance testing

---

**Total Test Cases**: 41
**High Priority**: 22
**Medium Priority**: 17
**Low Priority**: 2