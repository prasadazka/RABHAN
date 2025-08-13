/**
 * RABHAN Admin Dashboard Routes
 * Routes for dashboard data, analytics, and KPIs
 */

import { Router } from 'express';
import { DashboardController } from '@controllers/dashboard.controller';

const router = Router();
const dashboardController = new DashboardController();

/**
 * @route GET /api/dashboard/overview
 * @desc Get dashboard overview data
 * @access Admin
 */
router.get('/overview', dashboardController.getDashboardOverview);

/**
 * @route GET /api/dashboard/user-analytics
 * @desc Get user analytics and KPIs
 * @access Admin
 */
router.get('/user-analytics', dashboardController.getUserAnalytics);

/**
 * @route GET /api/dashboard/contractor-analytics
 * @desc Get contractor analytics and KPIs
 * @access Admin
 */
router.get('/contractor-analytics', dashboardController.getContractorAnalytics);

/**
 * @route GET /api/quotes
 * @desc Get quotes (proxy to quote service)
 * @access Admin
 */
router.get('/quotes', dashboardController.getQuotes);

/**
 * @route GET /api/quotes/:quoteId
 * @desc Get quote details (proxy to quote service)
 * @access Admin  
 */
router.get('/quotes/:quoteId', dashboardController.getQuoteDetails);

/**
 * @route GET /api/quotes/:quoteId/assignments
 * @desc Get quote assignments (proxy to quote service)
 * @access Admin
 */
router.get('/quotes/:quoteId/assignments', dashboardController.getQuoteAssignments);

/**
 * @route PUT /api/quotes/:quoteId/status
 * @desc Update quote status (proxy to quote service)
 * @access Admin
 */
router.put('/quotes/:quoteId/status', dashboardController.updateQuoteStatus);

/**
 * @route GET /api/dashboard/activity
 * @desc Get recent activity feed for admin dashboard
 * @access Admin
 */
router.get('/activity', dashboardController.getActivity);

/**
 * @route GET /api/dashboard/service-health
 * @desc Get microservice health status
 * @access Admin
 */
router.get('/service-health', dashboardController.getServiceHealth);

/**
 * @route GET /api/users/:userId/documents
 * @desc Get user documents
 * @access Admin
 */
router.get('/users/:userId/documents', dashboardController.getUserDocuments);

/**
 * @route GET /api/documents/proxy/:documentId
 * @desc Proxy document content for viewing
 * @access Admin
 */
router.get('/documents/proxy/:documentId', dashboardController.proxyDocument);

/**
 * @route GET /api/documents/download/:documentId
 * @desc Download document
 * @access Admin
 */
router.get('/documents/download/:documentId', dashboardController.downloadDocument);

/**
 * @route GET /api/users
 * @desc Get users list for admin
 * @access Admin
 */
router.get('/users', dashboardController.getUsers);

/**
 * @route GET /api/contractors
 * @desc Get contractors list for admin
 * @access Admin
 */
router.get('/contractors', dashboardController.getContractors);

/**
 * @route GET /api/contractors/:contractorId/documents
 * @desc Get contractor documents
 * @access Admin
 */
router.get('/contractors/:contractorId/documents', dashboardController.getContractorDocuments);

/**
 * @route PUT /api/contractors/:contractorId/status
 * @desc Update contractor status
 * @access Admin
 */
router.put('/contractors/:contractorId/status', dashboardController.updateContractorStatus);

/**
 * @route PUT /api/users/:userId/status
 * @desc Update user verification status
 * @access Admin
 */
router.put('/users/:userId/status', dashboardController.updateUserStatus);

/**
 * @route GET /api/products
 * @desc Get all products
 * @access Admin
 */
router.get('/products', dashboardController.getProducts);

/**
 * @route GET /api/products/pending
 * @desc Get products pending approval
 * @access Admin
 */
router.get('/products/pending', dashboardController.getPendingProducts);

/**
 * @route POST /api/products/:productId/approve
 * @desc Approve a product
 * @access Admin
 */
router.post('/products/:productId/approve', dashboardController.approveProduct);

/**
 * @route POST /api/products/:productId/reject
 * @desc Reject a product
 * @access Admin
 */
router.post('/products/:productId/reject', dashboardController.rejectProduct);

/**
 * @route POST /api/products/:productId/request-changes
 * @desc Request changes for a product
 * @access Admin
 */
router.post('/products/:productId/request-changes', dashboardController.requestProductChanges);

/**
 * @route GET /api/quotes
 * @desc Get all quote requests for admin
 * @access Admin
 */
router.get('/quotes', dashboardController.getQuotes);

/**
 * @route GET /api/quotes/:quoteId
 * @desc Get specific quote request details
 * @access Admin
 */
router.get('/quotes/:quoteId', dashboardController.getQuoteDetails);

/**
 * @route GET /api/quotes/:quoteId/assignments
 * @desc Get contractor assignments for a quote
 * @access Admin
 */
router.get('/quotes/:quoteId/assignments', dashboardController.getQuoteAssignments);

/**
 * @route PUT /api/quotes/:quoteId/status
 * @desc Update quote status
 * @access Admin
 */
router.put('/quotes/:quoteId/status', dashboardController.updateQuoteStatus);

export { router as dashboardRoutes };