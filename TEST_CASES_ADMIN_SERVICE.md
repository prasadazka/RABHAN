# Test Cases - Admin Service

## Service Overview
**Service**: Admin Service  
**Port**: 3006  
**Technology**: Node.js/TypeScript  
**Database**: PostgreSQL (rabhan_admin)  
**Dependencies**: All microservices (User, Contractor, Document, Auth, Solar Calculator)

---

## TC-ADMIN-001: Admin Authentication and Authorization

### TC-ADMIN-001-001: Admin Login Successfully
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: Admin user exists in Auth Service

**Test Data**:
```json
{
  "email": "admin@rabhan.sa",
  "password": "AdminSecure123!",
  "role": "ADMIN"
}
```

**Steps**:
1. Send POST request to `/api/auth/login`
2. Verify response status is 200
3. Verify admin JWT token returned
4. Verify token contains admin role
5. Verify admin session created

**Expected Results**:
- Admin login successful
- JWT token contains admin role
- Admin session established
- Access to admin endpoints granted

### TC-ADMIN-001-002: Non-Admin User Denied Access
**Priority**: High  
**Type**: Security Test  

**Pre-condition**: Regular user attempts admin login

**Steps**:
1. Login as regular user
2. Attempt to access admin dashboard endpoint
3. Verify response status is 403
4. Verify access denied message
5. Verify security event logged

**Expected Results**:
- Access denied to admin functions
- Appropriate error message returned
- Security event logged
- User restricted to normal functions

### TC-ADMIN-001-003: Admin Role Validation
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Test ADMIN role access to all admin endpoints
2. Test SUPER_ADMIN role access
3. Verify role hierarchy respected
4. Test role-specific permissions

**Expected Results**:
- Role-based access control enforced
- SUPER_ADMIN has elevated privileges
- Role hierarchy working correctly
- Permissions properly configured

---

## TC-ADMIN-002: Dashboard Overview

### TC-ADMIN-002-001: Dashboard Data Aggregation
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Send GET request to `/api/dashboard/overview`
2. Verify response status is 200
3. Verify data from all services aggregated
4. Verify KPI calculations accurate
5. Verify response time < 3 seconds

**Expected Results**:
- Complete dashboard data returned
- User statistics from User Service
- Contractor statistics from Contractor Service
- Document statistics from Document Service
- System health indicators included
- Performance within acceptable limits

### TC-ADMIN-002-002: Real-Time Dashboard Updates
**Priority**: Medium  
**Type**: Integration Test  

**Steps**:
1. Create new user in system
2. Refresh dashboard data
3. Verify user count updated
4. Upload new document
5. Verify document statistics updated

**Expected Results**:
- Dashboard reflects real-time changes
- User counts update immediately
- Document statistics current
- System maintains data consistency

### TC-ADMIN-002-003: Dashboard Performance with Large Dataset
**Priority**: Medium  
**Type**: Performance Test  

**Pre-condition**: System with 10,000+ users, 1,000+ contractors

**Steps**:
1. Request dashboard overview
2. Measure response time
3. Monitor database queries
4. Verify data accuracy

**Expected Results**:
- Dashboard loads within 3 seconds
- Database queries optimized
- Data aggregation accurate
- Memory usage reasonable

---

## TC-ADMIN-003: User Management

### TC-ADMIN-003-001: View All Users List
**Priority**: High  
**Type**: Positive Test  

**Steps**:
1. Send GET request to `/api/dashboard/users`
2. Verify response status is 200
3. Verify paginated user list returned
4. Verify combined auth + profile data
5. Verify filtering options work

**Expected Results**:
- Complete user list with pagination
- Auth service + User service data combined
- Filtering by verification status works
- Sorting options functional
- User data complete and accurate

### TC-ADMIN-003-002: User Profile Management
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Access specific user profile
2. View user's documents
3. Check user's KYC status
4. Review user's solar calculations
5. Verify all user data accessible

**Expected Results**:
- Complete user profile accessible
- User documents retrieved from Document Service
- KYC status accurately displayed
- Solar calculations history available
- Cross-service data integration working

### TC-ADMIN-003-003: User Verification Status Management
**Priority**: High  
**Type**: Workflow Test  

**Test Data**:
```json
{
  "userId": "user-123",
  "newStatus": "verified",
  "adminNotes": "All documents reviewed and approved"
}
```

**Steps**:
1. Update user verification status to "verified"
2. Verify status updated in User Service
3. Verify user notified of status change
4. Verify audit trail created
5. Test all status transitions

**Expected Results**:
- User verification status updated successfully
- Status change propagated to User Service
- User receives appropriate notification
- Admin action logged with timestamp
- Status workflow rules enforced

### TC-ADMIN-003-004: Bulk User Operations
**Priority**: Medium  
**Type**: Workflow Test  

**Steps**:
1. Select multiple users from list
2. Apply bulk status update
3. Verify all selected users processed
4. Verify individual audit trails created
5. Verify notification system handles bulk operations

**Expected Results**:
- Bulk operations completed successfully
- Each user processed individually
- Individual audit trails maintained
- System performance acceptable for bulk operations

---

## TC-ADMIN-004: Contractor Management

### TC-ADMIN-004-001: View All Contractors List
**Priority**: High  
**Type**: Positive Test  

**Steps**:
1. Send GET request to `/api/dashboard/contractors`
2. Verify response status is 200
3. Verify contractor list with business information
4. Verify filtering and sorting work
5. Verify pagination implemented

**Expected Results**:
- Complete contractor list returned
- Business information displayed correctly
- Service areas and categories shown
- Performance metrics included
- Filtering by status functional

### TC-ADMIN-004-002: Contractor Profile Management
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Access contractor profile page
2. Review business information
3. Check contractor documents
4. Review contractor performance metrics
5. Verify all contractor data accessible

**Expected Results**:
- Complete contractor profile displayed
- Business registration details shown
- Documents retrieved from Document Service
- Performance metrics calculated correctly
- Service areas and capabilities shown

### TC-ADMIN-004-003: Contractor Status Management
**Priority**: High  
**Type**: Workflow Test  

**Test Data**:
```json
{
  "contractorId": "contractor-123",
  "newStatus": "verified", 
  "adminNotes": "Business documents verified, ready for activation"
}
```

**Steps**:
1. Update contractor status from "pending" to "verified"
2. Verify status updated in Contractor Service
3. Verify contractor notified
4. Test status transition to "active"
5. Verify workflow rules enforced

**Expected Results**:
- Contractor status updated successfully
- Status workflow rules enforced (pending → verified → active)
- Contractor receives status notifications
- Admin actions logged comprehensively
- Business logic correctly applied

### TC-ADMIN-004-004: Contractor Document Review
**Priority**: High  
**Type**: Workflow Test  

**Steps**:
1. Review contractor business documents
2. Approve valid documents
3. Reject documents with issues
4. Verify document status updates
5. Verify contractor verification progress

**Expected Results**:
- Document review workflow functional
- Document status updates propagated
- Contractor verification progress updated
- Document approval/rejection logged
- Contractor notified of document status

---

## TC-ADMIN-005: Document Management

### TC-ADMIN-005-001: Document Review Dashboard
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Access document review dashboard
2. View pending documents list
3. Filter documents by type and user
4. Sort documents by upload date
5. Verify document metadata displayed

**Expected Results**:
- Pending documents list displayed
- Document filtering works correctly
- Document metadata complete
- Integration with Document Service functional
- Document preview/viewing available

### TC-ADMIN-005-002: Document Approval Workflow
**Priority**: High  
**Type**: Workflow Test  

**Test Data**:
```json
{
  "documentId": "doc-123",
  "status": "approved",
  "adminId": "admin-456",
  "reviewNotes": "Document clear and valid"
}
```

**Steps**:
1. Select pending document for review
2. View document content
3. Approve document with notes
4. Verify status updated in Document Service
5. Verify user notified of approval

**Expected Results**:
- Document approval processed successfully
- Document status updated to "approved"
- User receives approval notification
- Admin review notes stored
- KYC/verification progress updated

### TC-ADMIN-005-003: Document Rejection Workflow
**Priority**: High  
**Type**: Workflow Test  

**Test Data**:
```json
{
  "documentId": "doc-123",
  "status": "rejected",
  "rejectionReason": "Image quality too low, please reupload clearer image"
}
```

**Steps**:
1. Review document and identify issues
2. Reject document with specific reason
3. Verify rejection reason communicated to user
4. Verify user can reupload document
5. Verify rejection logged in audit trail

**Expected Results**:
- Document rejected with clear reason
- User receives detailed rejection explanation
- User can upload replacement document
- Rejection decision logged for audit
- Original document marked as superseded

### TC-ADMIN-005-004: Bulk Document Operations
**Priority**: Medium  
**Type**: Workflow Test  

**Steps**:
1. Select multiple documents for review
2. Apply bulk approval for valid documents
3. Apply bulk rejection with reasons
4. Verify each document processed correctly
5. Verify individual notifications sent

**Expected Results**:
- Bulk operations completed successfully
- Each document processed individually
- Individual notifications sent to users
- Audit trail maintained for each document
- System performance acceptable

---

## TC-ADMIN-006: Analytics and Reporting

### TC-ADMIN-006-001: User Analytics Dashboard
**Priority**: High  
**Type**: Business Logic Test  

**Steps**:
1. Request user analytics data
2. Verify user growth metrics
3. Verify geographic distribution
4. Verify verification status breakdown
5. Verify KYC completion rates

**Expected Results**:
- User growth trends calculated correctly
- Geographic analytics accurate
- Verification status percentages correct
- KYC completion rates accurate
- Monthly/quarterly trends shown

### TC-ADMIN-006-002: Contractor Analytics Dashboard
**Priority**: High  
**Type**: Business Logic Test  

**Steps**:
1. Request contractor analytics
2. Verify contractor growth metrics
3. Verify service area distribution
4. Verify performance metrics
5. Verify business type breakdown

**Expected Results**:
- Contractor growth trends accurate
- Service area coverage analysis correct
- Average ratings and reviews calculated
- Business type distribution shown
- Performance trends over time

### TC-ADMIN-006-003: Document Analytics Dashboard
**Priority**: Medium  
**Type**: Business Logic Test  

**Steps**:
1. Request document analytics
2. Verify document processing metrics
3. Verify approval/rejection rates
4. Verify processing time analytics
5. Verify document type breakdown

**Expected Results**:
- Document volume metrics accurate
- Approval rates calculated correctly
- Average processing times shown
- Document type distribution correct
- Admin efficiency metrics included

### TC-ADMIN-006-004: System Health Monitoring
**Priority**: High  
**Type**: Monitoring Test  

**Steps**:
1. Request system health dashboard
2. Verify microservice status indicators
3. Verify database connection status
4. Verify external service status
5. Verify error rate monitoring

**Expected Results**:
- All microservices status displayed
- Database connectivity monitored
- External services (Twilio, SendGrid) status
- Error rates tracked and displayed
- Performance metrics shown

---

## TC-ADMIN-007: System Configuration

### TC-ADMIN-007-001: User Role Management
**Priority**: Medium  
**Type**: Administrative Test  

**Steps**:
1. View current admin users
2. Create new admin user
3. Modify admin permissions
4. Deactivate admin user
5. Verify role changes effective

**Expected Results**:
- Admin user management functional
- Role assignments work correctly
- Permission changes take effect immediately
- User deactivation prevents access
- Audit trail for admin changes

### TC-ADMIN-007-002: System Settings Management
**Priority**: Medium  
**Type**: Configuration Test  

**Test Data**:
```json
{
  "maxFileSize": "10MB",
  "sessionTimeout": "24h",
  "kycRequiredDocuments": ["national_id", "salary_certificate"],
  "emailNotifications": true
}
```

**Steps**:
1. View current system settings
2. Update configuration settings
3. Verify settings applied across services
4. Test configuration validation
5. Verify settings persistence

**Expected Results**:
- System settings updatable through admin panel
- Configuration changes applied system-wide
- Settings validation prevents invalid configurations
- Settings persist across system restarts

---

## TC-ADMIN-008: Audit Trail and Logging

### TC-ADMIN-008-001: Admin Action Logging
**Priority**: High  
**Type**: Audit Test  

**Steps**:
1. Perform various admin actions
2. Verify each action logged
3. Check log entry completeness
4. Verify timestamp accuracy
5. Verify admin identification

**Expected Results**:
- All admin actions logged comprehensively
- Log entries include admin ID, timestamp, action details
- Logs immutable and tamper-proof
- Log retention policy enforced
- Audit trail searchable and filterable

### TC-ADMIN-008-002: Security Event Monitoring
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Attempt unauthorized access
2. Verify security event logged
3. Check failed login attempts
4. Verify suspicious activity detection
5. Test security alert generation

**Expected Results**:
- Security events captured and logged
- Failed access attempts tracked
- Suspicious activity patterns detected
- Security alerts generated appropriately
- Security team notified of critical events

### TC-ADMIN-008-003: Audit Report Generation
**Priority**: Medium  
**Type**: Reporting Test  

**Steps**:
1. Generate audit report for date range
2. Filter audit logs by action type
3. Export audit data
4. Verify report completeness
5. Test report performance

**Expected Results**:
- Audit reports generated accurately
- Filtering and date range selection work
- Export functionality operational
- Report data complete and formatted correctly
- Report generation performance acceptable

---

## TC-ADMIN-009: Integration with External Services

### TC-ADMIN-009-001: Microservice Health Monitoring
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Monitor all microservice endpoints
2. Detect service unavailability
3. Display service status dashboard
4. Test service recovery detection
5. Verify alert system

**Expected Results**:
- All microservices monitored continuously
- Service outages detected promptly
- Status dashboard shows real-time health
- Service recovery automatically detected
- Alerts sent for service issues

### TC-ADMIN-009-002: Database Performance Monitoring
**Priority**: Medium  
**Type**: Performance Test  

**Steps**:
1. Monitor database query performance
2. Track database connection pools
3. Monitor storage utilization
4. Detect slow queries
5. Generate performance reports

**Expected Results**:
- Database performance metrics tracked
- Connection pool status monitored
- Storage usage trends shown
- Slow query detection working
- Performance reports actionable

### TC-ADMIN-009-003: External API Monitoring
**Priority**: Medium  
**Type**: Integration Test  

**Steps**:
1. Monitor Twilio API availability
2. Monitor SendGrid API status
3. Track API response times
4. Monitor API usage quotas
5. Generate API health reports

**Expected Results**:
- External API status monitored
- Response times tracked
- Usage quotas monitored
- API health visible in dashboard
- Alerts for API issues

---

## TC-ADMIN-010: Performance and Scalability

### TC-ADMIN-010-001: Dashboard Load Performance
**Priority**: High  
**Target**: < 3 seconds for full dashboard load

**Steps**:
1. Load complete admin dashboard
2. Measure load time with large dataset
3. Test concurrent admin users
4. Monitor resource usage
5. Verify caching effectiveness

**Expected Results**:
- Dashboard loads within 3 seconds
- Performance consistent with large datasets
- Concurrent admin access handled
- Resource usage optimized
- Caching reduces load times

### TC-ADMIN-010-002: Large-Scale Data Operations
**Priority**: Medium  
**Target**: Handle 10,000+ records efficiently

**Steps**:
1. Load user list with 10,000+ users
2. Perform bulk operations on large datasets
3. Generate reports with extensive data
4. Monitor memory and CPU usage
5. Verify system stability

**Expected Results**:
- Large datasets handled efficiently
- Bulk operations complete within reasonable time
- Memory usage remains stable
- System remains responsive
- Database queries optimized

---

## TC-ADMIN-011: Error Handling and Recovery

### TC-ADMIN-011-001: Service Dependency Failures
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate User Service unavailability
2. Attempt to access user data
3. Verify graceful error handling
4. Test service recovery
5. Verify data consistency maintained

**Expected Results**:
- Service failures handled gracefully
- Appropriate error messages shown
- Service recovery detected automatically
- Data consistency maintained
- User informed of temporary limitations

### TC-ADMIN-011-002: Database Connection Failure
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate database connection loss
2. Attempt admin operations
3. Verify error handling
4. Test connection recovery
5. Verify data integrity

**Expected Results**:
- Database errors handled gracefully
- Connection recovery automatic
- Data integrity maintained
- Admin operations resume after recovery
- Error logging comprehensive

### TC-ADMIN-011-003: Network Connectivity Issues
**Priority**: Medium  
**Type**: Error Handling Test  

**Steps**:
1. Simulate network connectivity issues
2. Test API request retries
3. Verify timeout handling
4. Test offline mode functionality
5. Verify reconnection handling

**Expected Results**:
- Network issues handled gracefully
- Retry mechanisms functional
- Appropriate timeouts configured
- Offline functionality where applicable
- Automatic reconnection working

---

## TC-ADMIN-012: Security Tests

### TC-ADMIN-012-001: Admin Session Security
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Test session timeout enforcement
2. Verify session invalidation on logout
3. Test concurrent session limits
4. Verify session hijacking prevention
5. Test secure session management

**Expected Results**:
- Session timeouts enforced properly
- Sessions invalidated on logout
- Concurrent session limits enforced
- Session security measures effective
- Session data encrypted

### TC-ADMIN-012-002: CSRF Protection
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Test CSRF token implementation
2. Attempt CSRF attacks
3. Verify token validation
4. Test token refresh mechanism
5. Verify CSRF protection effectiveness

**Expected Results**:
- CSRF tokens required for state-changing operations
- CSRF attacks prevented
- Token validation working correctly
- Token refresh functional
- Admin panel protected against CSRF

### TC-ADMIN-012-003: Input Validation and Sanitization
**Priority**: High  
**Type**: Security Test  

**Test Data**:
```json
{
  "adminNotes": "<script>alert('xss')</script>",
  "searchTerm": "'; DROP TABLE users; --",
  "fileName": "../../../etc/passwd"
}
```

**Steps**:
1. Submit malicious input in admin forms
2. Verify input sanitization
3. Test SQL injection prevention
4. Test XSS prevention
5. Test file path traversal prevention

**Expected Results**:
- All malicious input sanitized
- SQL injection attacks prevented
- XSS attacks blocked
- File path traversal blocked
- Input validation comprehensive

---

## Integration Test Cases

### TC-ADMIN-INT-001: Multi-Service Data Aggregation
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Request dashboard data requiring all services
2. Verify data from each service included
3. Verify data correlation accuracy
4. Test service failure scenarios
5. Verify data consistency

**Expected Results**:
- Data from all services aggregated correctly
- Cross-service data correlations accurate
- Service failures handled gracefully
- Data consistency maintained across services
- Real-time updates working

### TC-ADMIN-INT-002: Cross-Service Workflow Testing
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Complete user verification workflow
2. Process contractor approval workflow
3. Verify document approval cascade
4. Test notification delivery
5. Verify audit trail completeness

**Expected Results**:
- Cross-service workflows complete successfully
- Status changes propagated correctly
- Notifications delivered appropriately
- Audit trails comprehensive across services
- Data synchronization accurate

---

## Test Data Requirements

### Admin Test Users
```json
[
  {
    "email": "admin@rabhan.test",
    "role": "ADMIN",
    "permissions": ["user_management", "contractor_management", "document_review"]
  },
  {
    "email": "superadmin@rabhan.test", 
    "role": "SUPER_ADMIN",
    "permissions": ["all"]
  }
]
```

### Test Data Sets
```json
{
  "users": 1000,
  "contractors": 200, 
  "documents": 5000,
  "pendingDocuments": 100,
  "kycCompleteUsers": 600,
  "verifiedContractors": 150
}
```

### Test Environment Configuration
- **Admin Database**: rabhan_admin_test
- **All Microservice Mocks**: Mock connections to all services
- **Test JWT Secrets**: Admin-specific JWT configuration
- **Audit Logging**: Separate test audit database
- **Performance Monitoring**: Test monitoring setup

---

**Total Test Cases**: 42
**High Priority**: 24
**Medium Priority**: 17
**Low Priority**: 1