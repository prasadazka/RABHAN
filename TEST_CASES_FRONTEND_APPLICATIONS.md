# Test Cases - Frontend Applications

## Applications Overview
**Admin Dashboard**: React/TypeScript (Port 3000)  
**User Web Application**: React/TypeScript (Port 3000)  
**Technology Stack**: React, TypeScript, Vite, Tailwind CSS, i18next  
**Features**: Multi-language (Arabic/English), Responsive Design, Theme Management

---

## TC-FRONTEND-001: Admin Dashboard Authentication

### TC-FRONTEND-001-001: Admin Login Flow
**Priority**: High  
**Type**: E2E Test  

**Steps**:
1. Navigate to admin login page
2. Enter valid admin credentials
3. Click login button
4. Verify redirect to dashboard
5. Verify admin session established

**Expected Results**:
- Login form displays correctly
- Valid credentials accepted
- Redirect to main dashboard
- Admin navigation menu visible
- Session token stored securely

### TC-FRONTEND-001-002: Invalid Admin Login
**Priority**: High  
**Type**: Negative Test  

**Test Data**:
```json
{
  "email": "admin@rabhan.sa",
  "password": "wrongpassword"
}
```

**Steps**:
1. Enter invalid credentials
2. Click login button
3. Verify error message displayed
4. Verify no redirect occurs
5. Verify session not created

**Expected Results**:
- Error message displayed clearly
- User remains on login page
- No admin access granted
- Form validation feedback shown

### TC-FRONTEND-001-003: Session Timeout Handling
**Priority**: Medium  
**Type**: Security Test  

**Steps**:
1. Login as admin
2. Wait for session timeout
3. Attempt dashboard operation
4. Verify automatic logout
5. Verify redirect to login page

**Expected Results**:
- Session timeout detected
- Automatic logout performed
- User redirected to login
- Session data cleared
- Re-authentication required

---

## TC-FRONTEND-002: Admin Dashboard Navigation

### TC-FRONTEND-002-001: Dashboard Menu Navigation
**Priority**: High  
**Type**: UI Test  

**Navigation Items**:
- Dashboard Overview
- Users Management
- Contractors Management  
- Documents Review
- Analytics
- Settings

**Steps**:
1. Test each navigation menu item
2. Verify correct page loads
3. Test breadcrumb navigation
4. Verify active state indicators
5. Test responsive menu behavior

**Expected Results**:
- All navigation links functional
- Correct pages load for each menu item
- Breadcrumbs update correctly
- Active states clearly indicated
- Mobile menu works properly

### TC-FRONTEND-002-002: Dashboard Sidebar Responsiveness
**Priority**: Medium  
**Type**: Responsive Test  

**Steps**:
1. Test sidebar on desktop (>1024px)
2. Test sidebar on tablet (768px-1024px)
3. Test sidebar on mobile (<768px)
4. Verify sidebar collapse/expand
5. Test hamburger menu functionality

**Expected Results**:
- Sidebar displays correctly on all screen sizes
- Responsive breakpoints working
- Mobile hamburger menu functional
- Sidebar state persists appropriately
- Touch interactions work on mobile

### TC-FRONTEND-002-003: Dashboard Header Components
**Priority**: Medium  
**Type**: UI Test  

**Header Components**:
- Logo
- Language toggle (AR/EN)
- Theme toggle
- Admin profile dropdown
- Notifications

**Steps**:
1. Verify all header components render
2. Test language toggle functionality
3. Test theme toggle (light/dark)
4. Test profile dropdown menu
5. Test notification system

**Expected Results**:
- All header components visible
- Language toggle switches interface language
- Theme toggle changes colors correctly
- Profile dropdown shows admin options
- Notifications display and update

---

## TC-FRONTEND-003: User Management Interface

### TC-FRONTEND-003-001: Users List Display
**Priority**: High  
**Type**: UI Test  

**Steps**:
1. Navigate to Users management page
2. Verify users table displays
3. Test table sorting functionality
4. Test pagination controls
5. Verify user data accuracy

**Expected Results**:
- Users table displays with all columns
- Sorting works for each sortable column
- Pagination navigation functional
- User data matches backend data
- Loading states shown appropriately

### TC-FRONTEND-003-002: User Search and Filtering
**Priority**: High  
**Type**: Functional Test  

**Test Data**:
```json
{
  "searchTerm": "ahmed",
  "filters": {
    "verificationStatus": "verified",
    "region": "Riyadh",
    "kycStatus": "completed"
  }
}
```

**Steps**:
1. Enter search term in search box
2. Apply verification status filter
3. Apply region filter
4. Verify filtered results
5. Test filter combinations

**Expected Results**:
- Search filters users by name/email
- Status filters work correctly
- Region filters work correctly
- Multiple filters combine properly
- Search results update in real-time

### TC-FRONTEND-003-003: User Profile Navigation
**Priority**: High  
**Type**: Navigation Test  

**Steps**:
1. Click on user name from users list
2. Verify navigation to user profile page
3. Verify user profile data displayed
4. Test back navigation
5. Verify URL updates correctly

**Expected Results**:
- Clickable user names navigate to profile
- User profile page loads correctly
- Complete user data displayed
- Navigation history maintained
- URLs are bookmarkable

### TC-FRONTEND-003-004: User Status Management UI
**Priority**: High  
**Type**: Workflow Test  

**Steps**:
1. Open user profile page
2. Verify current status displayed
3. Click status change button (Approve/Reject)
4. Verify confirmation dialog
5. Confirm status change
6. Verify UI updates with new status

**Expected Results**:
- Current status clearly displayed
- Status change buttons context-sensitive
- Confirmation dialog prevents accidental changes
- Status updates reflected immediately in UI
- Success/error messages shown

---

## TC-FRONTEND-004: Contractor Management Interface

### TC-FRONTEND-004-001: Contractors List Display
**Priority**: High  
**Type**: UI Test  

**Steps**:
1. Navigate to Contractors management page
2. Verify contractors table displays
3. Test business name clickability
4. Verify contractor data columns
5. Test table responsiveness

**Expected Results**:
- Contractors table displays correctly
- Business names are clickable links
- All relevant data columns shown
- Table responsive on all screen sizes
- Data formatting appropriate

### TC-FRONTEND-004-002: Contractor Profile Page
**Priority**: High  
**Type**: UI Test  

**Steps**:
1. Click on contractor business name
2. Verify contractor profile page loads
3. Verify all profile sections display
4. Test document viewing functionality
5. Verify performance metrics display

**Expected Results**:
- Contractor profile page loads completely
- Business information section displayed
- Location and service areas shown
- Documents section with viewing capability
- Performance stats accurately displayed

### TC-FRONTEND-004-003: Contractor Status Management
**Priority**: High  
**Type**: Workflow Test  

**Steps**:
1. Access contractor profile
2. Verify current status displayed
3. Test status change workflow
4. Verify status transition rules
5. Confirm status update success

**Expected Results**:
- Current contractor status clearly shown
- Status change buttons appropriate for current state
- Status transition rules enforced
- Status updates reflected immediately
- Audit trail visible

### TC-FRONTEND-004-004: Contractor Documents Review
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Access contractor documents section
2. Verify documents list displays
3. Click document to view
4. Test document approval/rejection
5. Verify document status updates

**Expected Results**:
- Contractor documents list correctly
- Document viewer opens documents properly
- Document approval workflow functional
- Status changes update in real-time
- Document history maintained

---

## TC-FRONTEND-005: Document Management Interface

### TC-FRONTEND-005-001: Document Review Dashboard
**Priority**: High  
**Type**: UI Test  

**Steps**:
1. Navigate to Documents review page
2. Verify pending documents list
3. Test document filtering by type
4. Test document sorting options
5. Verify document metadata display

**Expected Results**:
- Pending documents displayed correctly
- Document type filtering functional
- Sorting by date/status works
- Document metadata clearly shown
- Document thumbnails/previews visible

### TC-FRONTEND-005-002: Document Viewer Component
**Priority**: High  
**Type**: UI Test  

**Steps**:
1. Click on document to view
2. Verify document viewer opens
3. Test PDF viewing functionality
4. Test image viewing functionality
5. Test document download

**Expected Results**:
- Document viewer modal opens
- PDF documents display correctly
- Images display with proper scaling
- Download functionality works
- Viewer controls responsive

### TC-FRONTEND-005-003: Document Approval Workflow
**Priority**: High  
**Type**: Workflow Test  

**Steps**:
1. Open document for review
2. Click approve button
3. Add approval notes
4. Confirm approval
5. Verify document status updated

**Expected Results**:
- Approval process intuitive
- Notes field allows admin comments
- Confirmation prevents accidental approval
- Status updates immediately in UI
- User notification triggered

### TC-FRONTEND-005-004: Bulk Document Operations
**Priority**: Medium  
**Type**: Workflow Test  

**Steps**:
1. Select multiple documents
2. Choose bulk approval action
3. Confirm bulk operation
4. Verify all documents processed
5. Check individual notifications

**Expected Results**:
- Multiple document selection works
- Bulk operations complete successfully
- Progress indicator during processing
- All selected documents updated
- Individual audit trails maintained

---

## TC-FRONTEND-006: Analytics Dashboard

### TC-FRONTEND-006-001: Dashboard Charts and Widgets
**Priority**: High  
**Type**: UI Test  

**Dashboard Components**:
- User growth charts
- Contractor metrics
- Document processing stats
- Geographic distribution maps
- KPI widgets

**Steps**:
1. Navigate to analytics dashboard
2. Verify all charts load correctly
3. Test chart interactions (hover, click)
4. Verify data accuracy in widgets
5. Test chart responsiveness

**Expected Results**:
- All charts and widgets display correctly
- Chart data matches backend analytics
- Interactive features work smoothly
- Responsive design maintains readability
- Loading states show during data fetch

### TC-FRONTEND-006-002: Real-Time Dashboard Updates
**Priority**: Medium  
**Type**: Real-time Test  

**Steps**:
1. Open analytics dashboard
2. Create new user in system
3. Verify dashboard updates automatically
4. Upload new document
5. Verify document stats update

**Expected Results**:
- Dashboard updates in real-time
- No manual refresh required
- WebSocket/polling updates working
- Data consistency maintained
- Performance impact minimal

### TC-FRONTEND-006-003: Dashboard Export Functionality
**Priority**: Medium  
**Type**: Functional Test  

**Steps**:
1. Generate dashboard report
2. Test PDF export functionality
3. Test CSV data export
4. Verify export data accuracy
5. Test different date ranges

**Expected Results**:
- Export functionality accessible
- PDF reports generate correctly
- CSV exports contain accurate data
- Date range filtering works
- Export performance acceptable

---

## TC-FRONTEND-007: Internationalization (i18n)

### TC-FRONTEND-007-001: Arabic Language Support
**Priority**: High  
**Type**: Localization Test  

**Steps**:
1. Switch interface to Arabic
2. Verify all text translates correctly
3. Test RTL (Right-to-Left) layout
4. Verify Arabic fonts display properly
5. Test form inputs with Arabic text

**Expected Results**:
- Complete interface translation
- RTL layout correctly implemented
- Arabic fonts render properly
- Form inputs support Arabic text
- Date/number formats localized

### TC-FRONTEND-007-002: English Language Support
**Priority**: High  
**Type**: Localization Test  

**Steps**:
1. Switch interface to English
2. Verify all translations correct
3. Test LTR (Left-to-Right) layout
4. Verify English fonts and formatting
5. Test form validation messages

**Expected Results**:
- Complete English translation
- LTR layout properly implemented
- English fonts and spacing correct
- Form validation in English
- Professional terminology used

### TC-FRONTEND-007-003: Language Toggle Functionality
**Priority**: High  
**Type**: Functional Test  

**Steps**:
1. Start with Arabic interface
2. Click language toggle to English
3. Verify immediate language switch
4. Navigate through different pages
5. Switch back to Arabic

**Expected Results**:
- Language toggle works instantly
- No page refresh required
- Language preference persists
- All pages respect language setting
- Smooth transition between languages

### TC-FRONTEND-007-004: Mixed Content Handling
**Priority**: Medium  
**Type**: Localization Test  

**Steps**:
1. Test pages with mixed Arabic/English content
2. Verify proper text alignment
3. Test user-generated content display
4. Verify number and date formatting
5. Test search with mixed languages

**Expected Results**:
- Mixed content displays correctly
- Text alignment appropriate for content
- User content preserves original language
- Numbers/dates formatted per locale
- Search handles multilingual input

---

## TC-FRONTEND-008: Responsive Design

### TC-FRONTEND-008-001: Mobile Responsiveness (320px-768px)
**Priority**: High  
**Type**: Responsive Test  

**Steps**:
1. Test on various mobile screen sizes
2. Verify touch interactions work
3. Test mobile navigation menu
4. Verify table responsiveness
5. Test form usability on mobile

**Expected Results**:
- Interface adapts to mobile screens
- Touch targets appropriately sized
- Mobile navigation intuitive
- Tables scroll horizontally or stack
- Forms remain usable on small screens

### TC-FRONTEND-008-002: Tablet Responsiveness (768px-1024px)
**Priority**: Medium  
**Type**: Responsive Test  

**Steps**:
1. Test on tablet screen sizes
2. Verify sidebar behavior
3. Test touch and mouse interactions
4. Verify chart responsiveness
5. Test landscape vs portrait modes

**Expected Results**:
- Tablet layout optimized
- Sidebar adapts appropriately
- Both touch and mouse work
- Charts scale correctly
- Orientation changes handled

### TC-FRONTEND-008-003: Desktop Responsiveness (>1024px)
**Priority**: Medium  
**Type**: Responsive Test  

**Steps**:
1. Test on various desktop resolutions
2. Verify full sidebar functionality
3. Test large screen optimizations
4. Verify maximum width constraints
5. Test ultra-wide monitor support

**Expected Results**:
- Desktop layout fully functional
- Sidebar always visible and functional
- Large screens utilize space effectively
- Content doesn't stretch excessively
- Ultra-wide monitors supported

---

## TC-FRONTEND-009: Theme Management

### TC-FRONTEND-009-001: Light Theme Support
**Priority**: Medium  
**Type**: UI Test  

**Steps**:
1. Ensure light theme is default
2. Verify all components in light theme
3. Test color contrast ratios
4. Verify chart colors in light theme
5. Test accessibility compliance

**Expected Results**:
- Light theme as system default
- All components styled consistently
- Sufficient color contrast for accessibility
- Charts readable in light theme
- WCAG 2.1 compliance maintained

### TC-FRONTEND-009-002: Dark Theme Support
**Priority**: Medium  
**Type**: UI Test  

**Steps**:
1. Switch to dark theme
2. Verify all components in dark theme
3. Test color contrast in dark mode
4. Verify chart visibility
5. Test theme persistence

**Expected Results**:
- Dark theme available and functional
- All components properly styled
- Color contrast sufficient in dark mode
- Charts remain readable
- Theme preference persists across sessions

### TC-FRONTEND-009-003: Theme Toggle Functionality
**Priority**: Medium  
**Type**: Functional Test  

**Steps**:
1. Click theme toggle button
2. Verify instant theme switch
3. Test theme toggle persistence
4. Verify system preference detection
5. Test theme in different browsers

**Expected Results**:
- Theme toggles immediately
- No page refresh required
- Theme preference saved
- System preference detected initially
- Cross-browser compatibility

---

## TC-FRONTEND-010: User Web Application

### TC-FRONTEND-010-001: User Registration Flow
**Priority**: High  
**Type**: E2E Test  

**Steps**:
1. Navigate to registration page
2. Complete user registration form
3. Verify phone verification flow
4. Complete email verification
5. Verify redirect to profile setup

**Expected Results**:
- Registration form intuitive and complete
- Phone verification SMS received and processed
- Email verification link functional
- Successful registration leads to profile setup
- Error handling for invalid inputs

### TC-FRONTEND-010-002: User Profile Management
**Priority**: High  
**Type**: Functional Test  

**Steps**:
1. Login as registered user
2. Navigate to profile page
3. Update profile information
4. Upload profile documents
5. Verify profile completion tracking

**Expected Results**:
- Profile form pre-populated with existing data
- Profile updates save correctly
- Document upload workflow functional
- Profile completion percentage updates
- Validation prevents invalid data

### TC-FRONTEND-010-003: Solar Calculator Integration
**Priority**: High  
**Type**: Integration Test  

**Steps**:
1. Access solar calculator
2. Enter property and consumption details
3. Submit calculation request
4. Verify calculation results display
5. Save calculation to profile

**Expected Results**:
- Solar calculator form intuitive
- Real-time validation and guidance
- Calculation results comprehensive and clear
- System recommendations actionable
- Results saved to user profile

### TC-FRONTEND-010-004: Document Upload Workflow
**Priority**: High  
**Type**: Workflow Test  

**Steps**:
1. Navigate to documents section
2. Select document type to upload
3. Upload document file
4. Verify upload progress indication
5. Verify upload success confirmation

**Expected Results**:
- Document type selection clear
- File upload interface user-friendly
- Progress indicator during upload
- Upload success/failure feedback clear
- Document status tracking visible

---

## TC-FRONTEND-011: Performance Tests

### TC-FRONTEND-011-001: Page Load Performance
**Priority**: High  
**Target**: < 3 seconds initial load

**Steps**:
1. Clear browser cache
2. Navigate to admin dashboard
3. Measure Time to Interactive (TTI)
4. Test on 3G network simulation
5. Verify progressive loading

**Expected Results**:
- Initial page load < 3 seconds
- Time to Interactive < 5 seconds
- Acceptable performance on 3G
- Progressive enhancement working
- Critical resources prioritized

### TC-FRONTEND-011-002: Bundle Size Optimization
**Priority**: Medium  
**Target**: < 1MB total bundle size

**Steps**:
1. Analyze bundle size with build tools
2. Verify code splitting implemented
3. Test lazy loading of routes
4. Check for unused dependencies
5. Verify tree shaking effectiveness

**Expected Results**:
- Total bundle size optimized
- Code splitting reduces initial bundle
- Routes lazy load appropriately
- No unused code in bundles
- Tree shaking removes dead code

### TC-FRONTEND-011-003: Runtime Performance
**Priority**: Medium  
**Type**: Performance Test  

**Steps**:
1. Test table sorting with 1000+ rows
2. Measure chart rendering performance
3. Test form validation responsiveness
4. Monitor memory usage over time
5. Test mobile performance

**Expected Results**:
- Table operations remain responsive
- Charts render smoothly
- Form validation instant feedback
- No memory leaks detected
- Mobile performance acceptable

---

## TC-FRONTEND-012: Accessibility

### TC-FRONTEND-012-001: Keyboard Navigation
**Priority**: High  
**Type**: Accessibility Test  

**Steps**:
1. Navigate entire application using only keyboard
2. Test Tab order logical and complete
3. Verify focus indicators visible
4. Test keyboard shortcuts
5. Verify screen reader compatibility

**Expected Results**:
- Full keyboard navigation possible
- Tab order follows logical flow
- Focus indicators clearly visible
- Keyboard shortcuts functional
- Screen readers can navigate effectively

### TC-FRONTEND-012-002: ARIA Compliance
**Priority**: High  
**Type**: Accessibility Test  

**Steps**:
1. Audit ARIA labels and roles
2. Test with screen reader
3. Verify semantic HTML usage
4. Test form accessibility
5. Verify table accessibility

**Expected Results**:
- ARIA labels comprehensive and accurate
- Screen reader announces content correctly
- Semantic HTML used throughout
- Forms accessible to assistive technology
- Tables properly structured for accessibility

### TC-FRONTEND-012-003: Color Contrast and Visual Accessibility
**Priority**: Medium  
**Type**: Accessibility Test  

**Steps**:
1. Test color contrast ratios
2. Verify information not color-dependent
3. Test with high contrast mode
4. Test with colorblind simulation
5. Verify text scaling support

**Expected Results**:
- Color contrast meets WCAG AA standards
- Information conveyed beyond color alone
- High contrast mode supported
- Colorblind users can use interface
- Text scales to 200% without issues

---

## TC-FRONTEND-013: Cross-Browser Testing

### TC-FRONTEND-013-001: Chrome Browser Support
**Priority**: High  
**Type**: Cross-Browser Test  

**Steps**:
1. Test on latest Chrome version
2. Verify all functionality works
3. Test performance in Chrome
4. Verify Chrome DevTools compatibility
5. Test Chrome mobile

**Expected Results**:
- Full functionality in Chrome
- Optimal performance
- DevTools work properly
- Mobile Chrome supported
- No Chrome-specific issues

### TC-FRONTEND-013-002: Firefox Browser Support
**Priority**: Medium  
**Type**: Cross-Browser Test  

**Steps**:
1. Test on latest Firefox version
2. Verify functionality compatibility
3. Test Firefox-specific features
4. Verify extension compatibility
5. Test Firefox mobile

**Expected Results**:
- Full functionality in Firefox
- No Firefox-specific issues
- Firefox Developer Tools work
- Extensions don't break functionality
- Mobile Firefox supported

### TC-FRONTEND-013-003: Safari Browser Support
**Priority**: Medium  
**Type**: Cross-Browser Test  

**Steps**:
1. Test on latest Safari version
2. Verify WebKit compatibility
3. Test iOS Safari
4. Verify Safari-specific behaviors
5. Test Private Browsing mode

**Expected Results**:
- Full functionality in Safari
- WebKit features work correctly
- iOS Safari fully supported
- Safari quirks handled appropriately
- Private browsing mode functional

---

## Test Data Requirements

### Admin Test Accounts
```json
[
  {
    "email": "admin@rabhan.test",
    "password": "AdminTest123!",
    "role": "ADMIN",
    "permissions": ["all"]
  }
]
```

### User Test Accounts
```json
[
  {
    "email": "user@rabhan.test",
    "password": "UserTest123!",
    "role": "USER",
    "profileComplete": false
  }
]
```

### Test Environment Setup
- **Local Development Server**: Port 3000
- **Mock API Endpoints**: All backend services mocked
- **Test Databases**: Separate test data
- **Translation Files**: Complete AR/EN translations
- **Theme Variables**: Both light and dark themes

### Browser Testing Matrix
- Chrome 120+ (Desktop & Mobile)
- Firefox 119+ (Desktop & Mobile) 
- Safari 17+ (Desktop & Mobile)
- Edge 120+ (Desktop)

---

**Total Test Cases**: 40
**High Priority**: 23
**Medium Priority**: 16
**Low Priority**: 1