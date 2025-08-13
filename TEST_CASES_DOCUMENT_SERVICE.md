# Test Cases - Document Service

## Service Overview
**Service**: Document Service  
**Port**: 3003  
**Technology**: Node.js/TypeScript  
**Database**: PostgreSQL (rabhan_documents)  
**Storage**: MinIO Object Storage  
**Dependencies**: Auth Service, User Service, Contractor Service

---

## TC-DOC-001: Document Upload

### TC-DOC-001-001: Successful Document Upload
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```
File: national_id.pdf
Size: 2.5MB
Type: application/pdf
Category: national_id
UserId: user-123
```

**Steps**:
1. Send POST request to `/api/documents/upload`
2. Include file in multipart form data
3. Include category and user metadata
4. Verify response status is 201
5. Verify file stored in MinIO
6. Verify database record created
7. Verify file encrypted

**Expected Results**:
- Document uploaded successfully
- File stored securely in MinIO bucket
- Database record with metadata created
- File encrypted with unique key
- Unique document ID generated
- Upload status set to 'completed'

### TC-DOC-001-002: Upload File Too Large
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```
File: large_document.pdf
Size: 25MB (exceeds 10MB limit)
```

**Steps**:
1. Send POST request with oversized file
2. Verify response status is 413
3. Verify appropriate error message
4. Verify no file stored
5. Verify no database record created

**Expected Results**:
- Upload rejected
- Error: "File size exceeds maximum limit"
- No storage or database entries created
- Clear guidance on file size limits

### TC-DOC-001-003: Upload Unsupported File Type
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```
File: malicious.exe
Type: application/x-executable
```

**Steps**:
1. Send POST request with unsupported file type
2. Verify response status is 400
3. Verify validation error returned
4. Verify file not stored

**Expected Results**:
- Upload rejected
- Error lists supported file types
- Security protection against malicious files
- No file stored in system

### TC-DOC-001-004: Upload with Missing Required Fields
**Priority**: Medium  
**Type**: Negative Test  

**Test Data**:
```json
{
  "file": "document.pdf"
  // Missing category, userId
}
```

**Steps**:
1. Send POST request without required metadata
2. Verify response status is 400
3. Verify validation errors for missing fields
4. Verify upload not processed

**Expected Results**:
- Upload rejected
- Validation errors for each missing field
- Clear requirements communicated

---

## TC-DOC-002: File Type Validation

### TC-DOC-002-001: Valid PDF Upload
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```
File: document.pdf
MIME Type: application/pdf
```

**Steps**:
1. Upload PDF file
2. Verify MIME type validation passes
3. Verify file content validation
4. Verify upload successful

**Expected Results**:
- PDF accepted and processed
- MIME type correctly identified
- File integrity validated

### TC-DOC-002-002: Valid Image Upload
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```
File: national_id_front.jpg
MIME Type: image/jpeg
```

**Steps**:
1. Upload JPEG image
2. Verify image validation passes
3. Verify metadata extraction
4. Verify upload successful

**Expected Results**:
- Image accepted and processed
- Image metadata extracted
- Thumbnail generated if required

### TC-DOC-002-003: File Extension Spoofing Prevention
**Priority**: High  
**Type**: Security Test  

**Test Data**:
```
File: malware.pdf (actually executable)
MIME Type: application/x-executable
```

**Steps**:
1. Upload file with spoofed extension
2. Verify MIME type detection
3. Verify upload rejected
4. Verify security log entry

**Expected Results**:
- File type spoofing detected
- Upload rejected for security
- Security event logged
- System protected from malicious files

---

## TC-DOC-003: Virus Scanning

### TC-DOC-003-001: Clean File Passes Virus Scan
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```
File: clean_document.pdf
Content: Normal business document
```

**Steps**:
1. Upload clean document
2. Verify virus scanning initiated
3. Verify scan passes
4. Verify document processed normally
5. Verify scan result logged

**Expected Results**:
- Virus scan completes successfully
- Clean file processed normally
- Scan results logged for audit
- Upload proceeds to next stage

### TC-DOC-003-002: Infected File Detected and Quarantined
**Priority**: High  
**Type**: Security Test  

**Test Data**:
```
File: eicar_test.pdf
Content: EICAR test virus signature
```

**Steps**:
1. Upload file with virus signature
2. Verify virus scanning detects threat
3. Verify file quarantined
4. Verify upload rejected
5. Verify security alert generated

**Expected Results**:
- Virus detected by scanner
- File quarantined immediately
- Upload rejected with security error
- Security team notified
- Incident logged for investigation

### TC-DOC-003-003: Virus Scanner Service Unavailable
**Priority**: Medium  
**Type**: Error Handling Test  

**Steps**:
1. Simulate virus scanner service down
2. Upload document
3. Verify fallback behavior
4. Verify appropriate handling

**Expected Results**:
- Service degrades gracefully
- Document queued for later scanning
- User informed of delay
- Service recovers when scanner available

---

## TC-DOC-004: Document Encryption

### TC-DOC-004-001: File Encryption on Upload
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Upload document
2. Verify file encrypted before storage
3. Verify encryption key generated
4. Verify encrypted file stored in MinIO
5. Verify original file not accessible

**Expected Results**:
- Document encrypted with AES-256
- Unique encryption key per document
- Encrypted file stored securely
- Original plaintext not accessible
- Encryption key stored separately

### TC-DOC-004-002: File Decryption on Download
**Priority**: High  
**Type**: Security Test  

**Pre-condition**: Encrypted document exists

**Steps**:
1. Request document download
2. Verify authentication checked
3. Verify decryption process
4. Verify original content returned
5. Verify decryption key accessed securely

**Expected Results**:
- Document decrypted correctly
- Original content integrity maintained
- Decryption keys accessed securely
- No plaintext stored temporarily

### TC-DOC-004-003: Encryption Key Management
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Upload multiple documents
2. Verify unique keys generated
3. Verify key storage security
4. Verify key rotation capabilities
5. Test key recovery process

**Expected Results**:
- Each document has unique encryption key
- Keys stored in secure key management system
- Key rotation supported
- Key recovery process functional
- Keys never stored with encrypted data

---

## TC-DOC-005: Document Categories and Metadata

### TC-DOC-005-001: Document Categorization
**Priority**: High  
**Type**: Positive Test  

**Test Data**:
```json
{
  "category": "national_id",
  "userType": "HOMEOWNER"
}
```

**Steps**:
1. Upload document with specific category
2. Verify category validation
3. Verify category-specific metadata
4. Verify category rules applied

**Expected Results**:
- Document categorized correctly
- Category-specific validation applied
- Appropriate metadata fields populated
- Business rules enforced per category

### TC-DOC-005-002: KYC Document Categories for Users
**Priority**: High  
**Type**: Business Logic Test  

**Test Categories**:
- national_id
- national_id_back
- salary_certificate
- bank_statement
- utility_bill

**Steps**:
1. Test each KYC document category
2. Verify category-specific validation
3. Verify required document tracking
4. Verify KYC completion calculation

**Expected Results**:
- All KYC categories supported
- Category-specific validation rules
- KYC progress tracked accurately
- Completion status calculated correctly

### TC-DOC-005-003: Business Document Categories for Contractors
**Priority**: High  
**Type**: Business Logic Test  

**Test Categories**:
- commercial_registration
- vat_certificate
- business_license
- insurance_certificate
- electrical_license

**Steps**:
1. Test each business document category
2. Verify contractor-specific validation
3. Verify business verification tracking
4. Verify compliance status updates

**Expected Results**:
- Business document categories supported
- Contractor verification tracked
- Compliance requirements enforced
- Business status updated automatically

### TC-DOC-005-004: Document Metadata Extraction
**Priority**: Medium  
**Type**: Positive Test  

**Steps**:
1. Upload PDF document
2. Verify metadata extraction
3. Check file size, creation date, etc.
4. Verify metadata stored correctly

**Expected Results**:
- File metadata extracted automatically
- Metadata stored in database
- Information available for search/filtering
- Metadata integrity maintained

---

## TC-DOC-006: Document Verification Workflow

### TC-DOC-006-001: Document Verification by Admin
**Priority**: High  
**Type**: Workflow Test  

**Pre-condition**: Document uploaded and pending

**Test Data**:
```json
{
  "status": "approved",
  "adminId": "admin-123",
  "notes": "Document verified and approved"
}
```

**Steps**:
1. Admin reviews uploaded document
2. Admin updates verification status
3. Verify status change in database
4. Verify user notification sent
5. Verify KYC progress updated

**Expected Results**:
- Document status updated to approved
- User notified of approval
- KYC/verification progress updated
- Admin action logged in audit trail

### TC-DOC-006-002: Document Rejection with Reason
**Priority**: High  
**Type**: Workflow Test  

**Test Data**:
```json
{
  "status": "rejected",
  "adminId": "admin-123",
  "rejectionReason": "Document image unclear, please reupload"
}
```

**Steps**:
1. Admin rejects document with reason
2. Verify status updated to rejected
3. Verify rejection reason stored
4. Verify user notification sent
5. Verify reupload allowed

**Expected Results**:
- Document marked as rejected
- Clear rejection reason provided
- User can reupload document
- Previous version marked as superseded

### TC-DOC-006-003: Bulk Document Verification
**Priority**: Medium  
**Type**: Workflow Test  

**Pre-condition**: Multiple documents pending

**Steps**:
1. Admin selects multiple documents
2. Admin applies bulk approval/rejection
3. Verify all documents processed
4. Verify individual notifications sent

**Expected Results**:
- Bulk operations completed successfully
- All selected documents processed
- Individual audit trails maintained
- Performance within acceptable limits

---

## TC-DOC-007: Document Access Control

### TC-DOC-007-001: User Document Access Control
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. User attempts to access own document
2. Verify access granted
3. User attempts to access other user's document
4. Verify access denied
5. Verify security event logged

**Expected Results**:
- Users can access only their own documents
- Unauthorized access prevented
- Security events logged
- Appropriate error messages returned

### TC-DOC-007-002: Admin Document Access
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Admin accesses any user document
2. Verify access granted for admin
3. Non-admin attempts admin access
4. Verify access denied for non-admin

**Expected Results**:
- Admins can access all documents
- Role-based access control enforced
- Admin access logged for audit
- Non-admin access properly restricted

### TC-DOC-007-003: Document Sharing Authorization
**Priority**: Medium  
**Type**: Security Test  

**Test Data**:
```json
{
  "documentId": "doc-123",
  "shareWithUserId": "user-456",
  "permissions": ["view"]
}
```

**Steps**:
1. Document owner shares document
2. Verify sharing permissions set
3. Shared user accesses document
4. Verify access granted with correct permissions

**Expected Results**:
- Document sharing works correctly
- Permissions enforced properly
- Sharing audit trail maintained
- Shared access can be revoked

---

## TC-DOC-008: Document Download and Viewing

### TC-DOC-008-001: Secure Document Download
**Priority**: High  
**Type**: Positive Test  

**Pre-condition**: User owns document

**Steps**:
1. Send GET request to `/api/documents/{documentId}/download`
2. Verify authentication checked
3. Verify authorization validated
4. Verify document decrypted
5. Verify original file returned

**Expected Results**:
- Document downloaded successfully
- Authentication/authorization enforced
- File decrypted correctly
- Original content integrity maintained
- Download activity logged

### TC-DOC-008-002: Document Streaming for Viewing
**Priority**: High  
**Type**: Positive Test  

**Steps**:
1. Request document for viewing (not download)
2. Verify streaming response
3. Verify partial content support
4. Verify viewing permissions

**Expected Results**:
- Document streams correctly for viewing
- Supports partial content requests
- Viewing permissions enforced
- No temporary files created

### TC-DOC-008-003: Document Thumbnail Generation
**Priority**: Medium  
**Type**: Positive Test  

**Pre-condition**: PDF or image document uploaded

**Steps**:
1. Upload PDF or image document
2. Verify thumbnail generation triggered
3. Verify thumbnail stored separately
4. Request thumbnail via API
5. Verify thumbnail returned

**Expected Results**:
- Thumbnails generated automatically
- Thumbnails stored efficiently
- Quick thumbnail access for UI
- Thumbnail quality adequate

---

## TC-DOC-009: Document Search and Filtering

### TC-DOC-009-001: Search Documents by Category
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "category": "national_id",
  "userId": "user-123"
}
```

**Steps**:
1. Send GET request to `/api/documents/search`
2. Include category filter
3. Verify filtered results returned
4. Verify pagination works

**Expected Results**:
- Search returns only matching categories
- Results properly paginated
- Search performance acceptable
- Accurate result counts

### TC-DOC-009-002: Filter by Verification Status
**Priority**: Medium  
**Type**: Positive Test  

**Test Data**:
```json
{
  "verificationStatus": "approved",
  "userId": "user-123"
}
```

**Steps**:
1. Filter documents by verification status
2. Verify only approved documents returned
3. Test multiple status filters
4. Verify result accuracy

**Expected Results**:
- Status filtering works correctly
- Multiple statuses supported
- Filter combinations work
- Results accurate and complete

### TC-DOC-009-003: Search Performance with Large Dataset
**Priority**: Medium  
**Type**: Performance Test  

**Pre-condition**: Database with 10,000+ documents

**Steps**:
1. Execute complex search query
2. Measure response time
3. Verify result accuracy
4. Test concurrent searches

**Expected Results**:
- Search completes within 2 seconds
- Database indexes utilized
- Accurate results returned
- Concurrent searches handled

---

## TC-DOC-010: KYC Workflow Integration

### TC-DOC-010-001: KYC Document Requirements
**Priority**: High  
**Type**: Business Logic Test  

**Steps**:
1. Get KYC requirements for user type
2. Verify required document categories
3. Check KYC completion status
4. Verify progress tracking

**Expected Results**:
- KYC requirements clearly defined
- Required documents identified
- Progress tracked accurately
- Completion status calculated correctly

### TC-DOC-010-002: KYC Status Updates
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. User uploads required KYC documents
2. Admin approves documents
3. Verify KYC status updates
4. Verify user service notification

**Expected Results**:
- KYC status updates automatically
- User Service receives status updates
- Status synchronization accurate
- Real-time updates functional

### TC-DOC-010-003: KYC Completion Workflow
**Priority**: High  
**Type**: Workflow Test  

**Steps**:
1. User completes all KYC document uploads
2. All documents get admin approval
3. Verify KYC marked as complete
4. Verify user account status updated

**Expected Results**:
- KYC completion detected automatically
- User account verification status updated
- Workflow triggers appropriate actions
- Process completion logged

---

## TC-DOC-011: Storage Management

### TC-DOC-011-001: MinIO Storage Operations
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Upload document to MinIO
2. Verify object stored correctly
3. Retrieve document from MinIO
4. Verify content integrity
5. Test MinIO error handling

**Expected Results**:
- Documents stored reliably in MinIO
- Object retrieval works correctly
- Content integrity maintained
- Error handling graceful

### TC-DOC-011-002: Storage Quota Management
**Priority**: Medium  
**Type**: Business Logic Test  

**Steps**:
1. Upload documents approaching user quota
2. Verify quota tracking
3. Attempt upload exceeding quota
4. Verify quota enforcement

**Expected Results**:
- Storage quota tracked accurately
- Quota limits enforced
- Clear quota status provided
- Quota exceeded gracefully handled

### TC-DOC-011-003: Storage Cleanup and Archival
**Priority**: Low  
**Type**: Maintenance Test  

**Steps**:
1. Mark documents for deletion
2. Execute cleanup process
3. Verify deleted documents removed
4. Verify archival process

**Expected Results**:
- Cleanup process functions correctly
- Deleted documents fully removed
- Archival maintains data integrity
- Storage space reclaimed

---

## TC-DOC-012: Error Handling and Resilience

### TC-DOC-012-001: MinIO Service Unavailable
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate MinIO service down
2. Attempt document upload
3. Verify graceful error handling
4. Verify retry mechanism
5. Test service recovery

**Expected Results**:
- Service handles MinIO outage gracefully
- Upload queued or failed appropriately
- Retry mechanism functions
- Service recovers automatically

### TC-DOC-012-002: Database Connection Failure
**Priority**: High  
**Type**: Error Handling Test  

**Steps**:
1. Simulate database connection loss
2. Attempt document operations
3. Verify error handling
4. Test connection recovery

**Expected Results**:
- Database errors handled gracefully
- Appropriate error messages returned
- Connection recovery automatic
- Data consistency maintained

### TC-DOC-012-003: Disk Space Exhaustion
**Priority**: Medium  
**Type**: Error Handling Test  

**Steps**:
1. Simulate storage full condition
2. Attempt document upload
3. Verify graceful failure
4. Verify cleanup mechanisms

**Expected Results**:
- Storage full condition handled
- Clear error messages provided
- Cleanup mechanisms activated
- Service continues operating

---

## TC-DOC-013: Performance Tests

### TC-DOC-013-001: File Upload Performance
**Priority**: High  
**Target**: < 5 seconds for 10MB file

**Steps**:
1. Upload various file sizes
2. Measure upload times
3. Test concurrent uploads
4. Monitor resource usage

**Expected Results**:
- Upload times within targets
- Concurrent uploads handled
- Resource usage reasonable
- Performance consistent

### TC-DOC-013-002: Document Retrieval Performance
**Priority**: Medium  
**Target**: < 1 second for document access

**Steps**:
1. Retrieve documents of various sizes
2. Measure access times
3. Test concurrent access
4. Monitor decryption performance

**Expected Results**:
- Document access within 1 second
- Decryption performance acceptable
- Concurrent access handled
- Cache effectiveness measured

---

## Integration Test Cases

### TC-DOC-INT-001: User Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. User uploads KYC documents
2. Verify User Service receives updates
3. Test KYC completion workflow
4. Verify status synchronization

**Expected Results**:
- Services integrate seamlessly
- Status updates synchronized
- KYC workflow functional
- Data consistency maintained

### TC-DOC-INT-002: Admin Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Admin reviews documents via Admin Service
2. Admin approves/rejects documents
3. Verify status updates propagated
4. Test bulk operations

**Expected Results**:
- Admin operations work correctly
- Status changes synchronized
- Bulk operations functional
- Audit trails comprehensive

### TC-DOC-INT-003: Contractor Service Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Contractor uploads business documents
2. Verify Contractor Service updates
3. Test business verification workflow
4. Verify contractor status updates

**Expected Results**:
- Contractor document workflow functional
- Status synchronization accurate
- Business verification working
- Contractor profiles updated

---

## Security Test Cases

### TC-DOC-SEC-001: File Upload Security
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Attempt malicious file uploads
2. Test file type spoofing
3. Verify virus scanning
4. Test unauthorized access

**Expected Results**:
- Malicious files blocked
- Security measures effective
- Virus scanning functional
- Unauthorized access prevented

### TC-DOC-SEC-002: Data Encryption Security
**Priority**: High  
**Type**: Security Test  

**Steps**:
1. Verify encryption implementation
2. Test key management security
3. Verify decryption controls
4. Test encryption key rotation

**Expected Results**:
- Strong encryption implemented
- Key management secure
- Decryption properly controlled
- Key rotation supported

---

## Test Data Requirements

### Test Documents
```json
[
  {
    "filename": "national_id.pdf",
    "size": "2.5MB",
    "type": "application/pdf",
    "category": "national_id",
    "content": "Clean test document"
  },
  {
    "filename": "salary_cert.jpg",
    "size": "1.2MB", 
    "type": "image/jpeg",
    "category": "salary_certificate"
  }
]
```

### Test Users
```json
[
  {
    "userId": "user-doc-test-1",
    "userType": "HOMEOWNER",
    "role": "USER"
  },
  {
    "userId": "contractor-doc-test-1",
    "userType": "CONTRACTOR", 
    "role": "CONTRACTOR"
  }
]
```

### Test Environment Configuration
- **Database**: rabhan_documents_test
- **MinIO**: Test bucket configuration
- **Virus Scanner**: Test/sandbox mode
- **Encryption**: Test encryption keys
- **Storage**: Separate test storage

---

**Total Test Cases**: 43
**High Priority**: 25
**Medium Priority**: 15
**Low Priority**: 3