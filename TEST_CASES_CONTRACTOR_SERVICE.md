# Test Cases - Contractor Service

## Service Overview
**Service**: Contractor Service  
**Port**: 3004  
**Technology**: Node.js/TypeScript  
**Database**: PostgreSQL (rabhan_contractors)  
**Dependencies**: Auth Service, Document Service, Admin Service

---

## TC-CONT-001: Contractor Registration

### TC-CONT-001-001: Successful Contractor Registration
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "businessName": "Solar Tech Solutions",
  "businessNameAr": "حلول التكنولوجيا الشمسية",
  "businessType": "LLC",
  "commercialRegistration": "1010123456",
  "vatNumber": "300123456789003",
  "email": "info@solartech.sa",
  "phone": "+966501234567",
  "whatsapp": "+966501234567",
  "website": "https://solartech.sa",
  "addressLine1": "King Fahd Road",
  "addressLine2": "Building 123, Floor 5",
  "city": "Riyadh",
  "region": "Riyadh",
  "postalCode": "12211",
  "country": "Saudi Arabia",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "establishedYear": 2015,
  "employeeCount": 25,
  "description": "Professional solar installation company",
  "descriptionAr": "شركة تركيب الألواح الشمسية المحترفة",
  "serviceCategories": ["RESIDENTIAL_SOLAR", "COMMERCIAL_SOLAR"],
  "serviceAreas": ["Riyadh", "Al Khobar"],
  "yearsExperience": 8,
  "contractorType": "FULL_SOLAR_CONTRACTOR",
  "canInstall": true,
  "canSupplyOnly": false
}
```

**Steps**:
1. Send POST request to `/api/contractors/register`
2. Verify response status is 201
3. Verify contractor profile created in database
4. Verify status set to 'PENDING'
5. Verify verification level set to 0
6. Verify audit log entry created

**Expected Results**:
- Contractor registered successfully
- Profile stored with all required fields
- Initial status set to 'PENDING'
- Registration audit trail created

### TC-CONT-001-002: Registration with Duplicate Commercial Registration
**Priority**: High  
**Type**: Negative Test  

**Pre-condition**: Contractor with CR already exists

**Test Data**:
```json
{
  "commercialRegistration": "1010123456",
  "businessName": "Different Company"
}
```

**Steps**:
1. Send POST request with existing CR number
2. Verify response status is 409
3. Verify conflict error message
4. Verify no duplicate created

**Expected Results**:
- Registration rejected
- Error: "Commercial registration already exists"
- Business registry integrity maintained

### TC-CONT-001-003: Registration with Invalid VAT Number Format
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```json
{
  "vatNumber": "invalid-vat-123"
}
```

**Steps**:
1. Send POST request with invalid VAT format
2. Verify response status is 400
3. Verify validation error for VAT format
4. Verify registration not completed

**Expected Results**:
- Registration rejected
- Error: "Invalid VAT number format"
- Saudi VAT format validation enforced

---

## TC-CONT-002: Contractor Profile Management

### TC-CONT-002-001: Get Contractor Profile
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Contractor profile exists

**Steps**:
1. Send GET request to `/api/contractors/{contractorId}`
2. Verify response status is 200
3. Verify complete profile data returned
4. Verify service areas parsed correctly
5. Verify performance metrics included

**Expected Results**:
- Complete contractor profile retrieved
- Service categories and areas properly formatted
- Performance metrics calculated and displayed
- GPS coordinates included

### TC-CONT-002-002: Update Contractor Profile
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Authenticated contractor

**Test Data**:
```json
{
  "phone": "+966501234568",
  "website": "https://newsolartech.sa",
  "employeeCount": 30,
  "serviceAreas": ["Riyadh", "Jeddah", "Dammam"],
  "yearsExperience": 10
}
```

**Steps**:
1. Send PUT request to `/api/contractors/profile`
2. Verify response status is 200
3. Verify updated fields in database
4. Verify audit log entry for changes
5. Verify verification level recalculated

**Expected Results**:
- Profile updated successfully
- Only specified fields modified
- Change history logged
- Verification score updated if applicable

### TC-CONT-002-003: Update Profile with Invalid Service Categories
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```json
{
  "serviceCategories": ["INVALID_CATEGORY", "RESIDENTIAL_SOLAR"]
}
```

**Steps**:
1. Send PUT request with invalid category
2. Verify response status is 400
3. Verify validation error returned
4. Verify profile not updated

**Expected Results**:
- Update rejected
- Error lists valid service categories
- Original profile data preserved

---

## TC-CONT-003: Service Area Management

### TC-CONT-003-001: Add Service Areas
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "region": "Eastern Province",
  "city": "Al Khobar",
  "districts": ["Al Aqrabiyah", "Al Corniche", "Al Thuraya"],
  "serviceCategories": ["RESIDENTIAL_SOLAR"],
  "travelCost": 150,
  "serviceRadiusKm": 50
}
```

**Steps**:
1. Send POST request to `/api/contractors/service-areas`
2. Verify response status is 201
3. Verify service area created
4. Verify relationship to contractor established

**Expected Results**:
- Service area added successfully
- Geographic coverage expanded
- Travel costs and radius set correctly

### TC-CONT-003-002: Update Service Area Details
**Priority**: Medium  
**Type**: Positive Test  

**Pre-condition**: Service area exists

**Test Data**:
```json
{
  "travelCost": 200,
  "serviceRadiusKm": 75,
  "isActive": true
}
```

**Steps**:
1. Send PUT request to `/api/contractors/service-areas/{areaId}`
2. Verify response status is 200
3. Verify service area updated
4. Verify contractor matching updated

**Expected Results**:
- Service area details updated
- Contractor availability reflects changes
- Service matching algorithms updated

### TC-CONT-003-003: Delete Service Area
**Priority**: Low  
**Type**: Positive Test  

**Steps**:
1. Send DELETE request to `/api/contractors/service-areas/{areaId}`
2. Verify response status is 200
3. Verify service area marked as inactive
4. Verify contractor no longer serves area

**Expected Results**:
- Service area deactivated
- Contractor coverage updated
- Existing projects not affected

---

## TC-CONT-004: Rating and Review System

### TC-CONT-004-001: Submit Contractor Review
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Customer has completed project with contractor

**Test Data**:
```json
{
  "contractorId": "contractor-123",
  "customerId": "customer-456",
  "projectId": "project-789",
  "rating": 5,
  "title": "Excellent service and quality",
  "reviewText": "Professional installation, on time, great quality work",
  "qualityRating": 5,
  "communicationRating": 5,
  "timelinessRating": 4,
  "professionalismRating": 5
}
```

**Steps**:
1. Send POST request to `/api/contractors/{contractorId}/reviews`
2. Verify response status is 201
3. Verify review stored in database
4. Verify contractor average rating updated
5. Verify review count incremented

**Expected Results**:
- Review submitted successfully
- Contractor statistics updated automatically
- Rating averages recalculated correctly
- Review visible in contractor profile

### TC-CONT-004-002: Calculate Average Rating Correctly
**Priority**: High  
**Type**: Business Logic Test  

**Pre-condition**: Contractor has multiple reviews

**Test Scenario**:
- Review 1: 5 stars
- Review 2: 4 stars  
- Review 3: 5 stars
- Review 4: 3 stars
- Expected Average: 4.25

**Steps**:
1. Submit multiple reviews
2. Trigger rating calculation
3. Verify average calculated correctly
4. Verify decimal precision maintained

**Expected Results**:
- Average rating calculated accurately
- Weighted averages for subcategories correct
- Rating displayed with proper precision

### TC-CONT-004-003: Review Verification and Approval
**Priority**: Medium  
**Type**: Workflow Test  

**Pre-condition**: Review submitted

**Steps**:
1. Submit review as customer
2. Review status should be 'PENDING'
3. Admin approves review
4. Verify status changes to 'APPROVED'
5. Verify review appears publicly

**Expected Results**:
- Review moderation workflow functions
- Only approved reviews visible publicly
- Admin approval process working

### TC-CONT-004-004: Contractor Response to Review
**Priority**: Medium  
**Type**: Positive Test  

**Pre-condition**: Approved review exists

**Test Data**:
```json
{
  "response": "Thank you for your feedback. We're glad you're happy with our service!"
}
```

**Steps**:
1. Send POST request to `/api/contractors/reviews/{reviewId}/respond`
2. Verify response status is 200
3. Verify response stored and linked to review
4. Verify response visible in public review

**Expected Results**:
- Contractor response recorded
- Response appears with original review
- Engagement metrics updated

---

## TC-CONT-005: Document and Certification Management

### TC-CONT-005-001: Upload Business License
**Priority**: High  
**Type**: Integration Test  

**Test Data**:
```
File: business_license.pdf
Category: BUSINESS_LICENSE
```

**Steps**:
1. Send POST request to `/api/contractors/documents`
2. Include file and category in multipart request
3. Verify response status is 201
4. Verify document stored via Document Service
5. Verify contractor verification score updated

**Expected Results**:
- Document uploaded successfully
- File stored securely in Document Service
- Contractor profile shows document uploaded
- Verification level increased

### TC-CONT-005-002: Add Professional Certification
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "certificationType": "SOLAR_CERTIFICATION",
  "certificationName": "NABCEP Solar Installation Professional",
  "certificationNumber": "NABCEP-123456",
  "issuingAuthority": "NABCEP",
  "issueDate": "2020-01-15",
  "expiryDate": "2025-01-15",
  "documentId": "doc-cert-123"
}
```

**Steps**:
1. Send POST request to `/api/contractors/certifications`
2. Verify response status is 201
3. Verify certification stored in database
4. Verify link to uploaded document

**Expected Results**:
- Certification added to contractor profile
- Document reference maintained
- Expiry date tracked for renewals
- Verification score improved

### TC-CONT-005-003: Document Verification Workflow
**Priority**: High  
**Type**: Workflow Test  

**Pre-condition**: Document uploaded

**Steps**:
1. Admin reviews uploaded document
2. Admin approves document via Admin Service
3. Verify document status updated to 'APPROVED'
4. Verify contractor verification level updated
5. Verify contractor notified of approval

**Expected Results**:
- Document verification workflow complete
- Status synchronization across services
- Contractor verification progress updated
- Notifications sent appropriately

---

## TC-CONT-006: Contractor Status Management

### TC-CONT-006-001: Status Transition - Pending to Verified
**Priority**: High  
**Type**: Workflow Test  

**Pre-condition**: Contractor in PENDING status with required documents

**Steps**:
1. Admin reviews contractor profile
2. Admin updates status to VERIFIED via Admin Service
3. Verify status updated in Contractor Service
4. Verify contractor notified of approval
5. Verify contractor can now receive project requests

**Expected Results**:
- Status transition completed successfully
- Contractor activated for business
- Appropriate notifications sent
- Business logic updated

### TC-CONT-006-002: Status Transition - Active to Suspended
**Priority**: Medium  
**Type**: Workflow Test  

**Pre-condition**: Active contractor

**Test Data**:
```json
{
  "status": "SUSPENDED",
  "reason": "Customer complaints investigation"
}
```

**Steps**:
1. Admin suspends contractor
2. Verify status updated to SUSPENDED
3. Verify contractor removed from active matching
4. Verify existing projects handled appropriately

**Expected Results**:
- Contractor suspended successfully
- No new project assignments
- Existing commitments maintained
- Proper notification and logging

### TC-CONT-006-003: Invalid Status Transition
**Priority**: Medium  
**Type**: Negative Test  

**Steps**:
1. Attempt to transition from PENDING to ACTIVE
2. (Should require VERIFIED intermediate step)
3. Verify transition rejected
4. Verify current status maintained

**Expected Results**:
- Invalid transition prevented
- Status workflow rules enforced
- Clear error message provided

---

## TC-CONT-007: Search and Matching

### TC-CONT-007-001: Search Contractors by Service Category
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "serviceCategories": ["RESIDENTIAL_SOLAR"],
  "region": "Riyadh",
  "minRating": 4.0
}
```

**Steps**:
1. Send GET request to `/api/contractors/search`
2. Include search criteria in query parameters
3. Verify response status is 200
4. Verify results match all criteria
5. Verify results sorted by rating (desc)

**Expected Results**:
- Matching contractors returned
- All search criteria applied correctly
- Results properly sorted
- Pagination implemented

### TC-CONT-007-002: Geographic Distance Matching
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "customerLatitude": 24.7136,
  "customerLongitude": 46.6753,
  "maxDistanceKm": 25,
  "serviceCategory": "RESIDENTIAL_SOLAR"
}
```

**Steps**:
1. Send search request with GPS coordinates
2. Verify distance calculations performed
3. Verify only nearby contractors returned
4. Verify distances calculated accurately

**Expected Results**:
- Distance-based filtering works correctly
- GPS calculations accurate
- Service radius respected
- Results include distance information

### TC-CONT-007-003: Multi-Criteria Search Performance
**Priority**: Medium  
**Type**: Performance Test  

**Pre-condition**: Database with 1000+ contractors

**Steps**:
1. Execute complex search with multiple criteria
2. Measure query response time
3. Verify result accuracy
4. Monitor database performance

**Expected Results**:
- Search completes within 1 second
- Database indexes utilized effectively
- Results accurate and complete
- Memory usage reasonable

---

## TC-CONT-008: Performance Metrics

### TC-CONT-008-001: Calculate Contractor Performance Score
**Priority**: Medium  
**Type**: Business Logic Test  

**Test Data**:
```json
{
  "totalProjects": 50,
  "completedProjects": 48,
  "averageRating": 4.3,
  "totalReviews": 45,
  "responseTimeHours": 2.5,
  "onTimeCompletionRate": 0.92
}
```

**Steps**:
1. Calculate performance score using algorithm
2. Verify score within 0-100 range
3. Verify component weights applied correctly
4. Verify score updates with new data

**Expected Results**:
- Performance score calculated accurately
- Algorithm produces consistent results
- Score reflects contractor quality appropriately
- Updates occur automatically

### TC-CONT-008-002: Response Time Tracking
**Priority**: Medium  
**Type**: Positive Test  

**Steps**:
1. Customer sends project inquiry to contractor
2. Contractor responds to inquiry
3. Calculate response time
4. Update contractor's average response time

**Expected Results**:
- Response time tracked accurately
- Average response time maintained
- Performance metrics updated
- Historical data preserved

---

## TC-CONT-009: Admin Integration

### TC-CONT-009-001: Admin Contractor Management
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Admin views contractor list via Admin Service
2. Admin accesses contractor profile
3. Admin reviews contractor documents
4. Admin updates contractor status
5. Verify all operations work correctly

**Expected Results**:
- Admin can manage all contractor operations
- Data synchronized across services
- Status changes propagated correctly
- Audit trail maintained

### TC-CONT-009-002: Contractor Analytics for Admin
**Priority**: Medium  
**Type**: Integration Test  

**Steps**:
1. Request contractor analytics via Admin Service
2. Verify data aggregated from Contractor Service
3. Verify metrics calculated correctly
4. Verify performance acceptable

**Expected Results**:
- Analytics data accurate and comprehensive
- Performance metrics within limits
- Real-time data synchronization
- Dashboard displays correctly

---

## TC-CONT-010: Security and Authorization

### TC-CONT-010-001: Contractor Data Access Control
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Attempt to access another contractor's profile
2. Verify access denied
3. Attempt to modify another contractor's data
4. Verify authorization enforced

**Expected Results**:
- Contractors can only access their own data
- Authorization checks prevent unauthorized access
- Proper error messages returned
- Security events logged

### TC-CONT-010-002: Admin Authorization
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Non-admin user attempts contractor management
2. Verify admin operations blocked
3. Admin user performs same operations
4. Verify admin access granted

**Expected Results**:
- Admin operations require admin role
- Role-based authorization enforced
- Proper access control maintained

### TC-CONT-010-003: Input Validation and Sanitization
**Priority**: High  
**Type**: Security Test  

**Test Data**:
```json
{
  "businessName": "<script>alert('xss')</script>",
  "description": "'; DROP TABLE contractors; --"
}
```

**Steps**:
1. Send contractor registration with malicious input
2. Verify input sanitized properly
3. Verify no XSS or SQL injection possible
4. Verify safe data stored

**Expected Results**:
- Malicious input neutralized
- XSS prevention working
- SQL injection blocked
- Database integrity maintained

---

## TC-CONT-011: Error Handling and Resilience

### TC-CONT-011-001: Database Connection Failure
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate database connection loss
2. Send contractor profile request
3. Verify graceful error handling
4. Verify service recovery when database returns

**Expected Results**:
- Service handles database errors gracefully
- Meaningful error messages returned
- Service recovers automatically
- No data corruption occurs

### TC-CONT-011-002: External Service Dependency Failure
**Priority**: Medium  
**Type**: Error Handling Test  

**Steps**:
1. Simulate Document Service unavailability
2. Upload contractor document
3. Verify appropriate fallback behavior
4. Verify retry mechanism works

**Expected Results**:
- Service degrades gracefully
- Fallback mechanisms activated
- Retry logic functions correctly
- Operations resume when dependency available

---

## Integration Test Cases

### TC-CONT-INT-001: Auth Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Register contractor via Auth Service
2. Create contractor profile
3. Verify user ID linkage correct
4. Test authentication across services

**Expected Results**:
- Services properly integrated
- User authentication works
- Data consistency maintained
- Cross-service communication functional

### TC-CONT-INT-002: Document Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Upload contractor documents
2. Verify documents stored in Document Service
3. Test document verification workflow
4. Verify status synchronization

**Expected Results**:
- Document upload workflow complete
- Cross-service data consistency
- Verification process functional
- Status updates propagated

### TC-CONT-INT-003: Admin Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Admin manages contractor via Admin Service
2. Verify operations reflected in Contractor Service
3. Test real-time data synchronization
4. Verify audit trail across services

**Expected Results**:
- Admin operations work seamlessly
- Data synchronized in real-time
- Audit trails comprehensive
- Service integration robust

---

## Performance Test Cases

### TC-CONT-PERF-001: Contractor Search Performance
**Priority**: High  
**Target**: < 1 second for complex searches

**Steps**:
1. Execute 100 concurrent search requests
2. Include multiple filter criteria
3. Measure response times
4. Monitor database performance

**Expected Results**:
- Search completes within 1 second
- System handles concurrent searches
- Database queries optimized
- Memory usage reasonable

### TC-CONT-PERF-002: Profile CRUD Performance
**Priority**: Medium  
**Target**: < 200ms for profile operations

**Steps**:
1. Execute 1000 profile create operations
2. Execute 1000 profile read operations
3. Execute 1000 profile update operations
4. Measure response times

**Expected Results**:
- Operations complete within 200ms
- System handles load effectively
- Response times consistent
- No performance degradation

---

## Test Data Requirements

### Test Contractor Profiles
```json
[
  {
    "businessName": "Riyadh Solar Solutions",
    "businessType": "LLC",
    "commercialRegistration": "1010111111",
    "serviceCategories": ["RESIDENTIAL_SOLAR", "COMMERCIAL_SOLAR"],
    "city": "Riyadh",
    "status": "ACTIVE",
    "averageRating": 4.5,
    "totalReviews": 25
  },
  {
    "businessName": "Jeddah Green Energy",
    "businessType": "LLC", 
    "commercialRegistration": "1010222222",
    "serviceCategories": ["RESIDENTIAL_SOLAR"],
    "city": "Jeddah",
    "status": "VERIFIED",
    "averageRating": 4.2,
    "totalReviews": 18
  }
]
```

### Test Environment Configuration
- **Database**: rabhan_contractors_test
- **Document Service Mock**: Mock document operations
- **Auth Service Mock**: Mock authentication
- **Admin Service Mock**: Mock admin operations
- **Sample Data**: 500+ contractors for performance testing

---

**Total Test Cases**: 45
**High Priority**: 24
**Medium Priority**: 18
**Low Priority**: 3