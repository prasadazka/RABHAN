/**
 * RABHAN Marketplace Service - Approval Routes
 * SAMA Compliant | Zero-Trust Security | Admin Workflow Management
 */

import { Router } from 'express';
import { approvalController } from '@/controllers/approval.controller';
import { 
  authenticateToken, 
  requireRole, 
  requireContractor,
  requireAdmin,
  UserRole 
} from '@/middleware/auth.middleware';

const router = Router();

// =====================================================
// ADMIN APPROVAL ROUTES
// =====================================================

/**
 * Get products pending approval
 * GET /api/v1/approvals/pending
 * Admin only - view products waiting for approval
 */
router.get(
  '/pending',
  authenticateToken,
  requireAdmin,
  approvalController.getPendingApprovals.bind(approvalController)
);

/**
 * Get approval statistics
 * GET /api/v1/approvals/stats
 * Admin only - approval workflow analytics
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  approvalController.getApprovalStats.bind(approvalController)
);

/**
 * Bulk approve products
 * POST /api/v1/approvals/bulk-approve
 * Admin only - approve multiple products at once
 */
router.post(
  '/bulk-approve',
  authenticateToken,
  requireAdmin,
  approvalController.bulkApprove.bind(approvalController)
);

/**
 * Get approval history for a product
 * GET /api/v1/approvals/history/:productId
 * Admins can see all, contractors can see their own products
 */
router.get(
  '/history/:productId',
  authenticateToken,
  requireRole([UserRole.CONTRACTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  approvalController.getApprovalHistory.bind(approvalController)
);

// =====================================================
// CONTRACTOR ROUTES
// =====================================================

/**
 * Submit product for approval
 * POST /api/v1/approvals/submit/:productId
 * Contractor only - submit their products for approval
 */
router.post(
  '/submit/:productId',
  authenticateToken,
  requireContractor,
  approvalController.submitForApproval.bind(approvalController)
);

// =====================================================
// ADMIN ACTION ROUTES (Dynamic)
// =====================================================

/**
 * Process product approval (approve/reject/request changes)
 * POST /api/v1/approvals/:productId
 * Admin only - make approval decisions
 */
router.post(
  '/:productId',
  authenticateToken,
  requireAdmin,
  approvalController.processApproval.bind(approvalController)
);

export { router as approvalRoutes };