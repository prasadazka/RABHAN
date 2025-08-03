import { Router } from 'express';
import { KYCController } from '../controllers/kyc.controller';

const router = Router();
const kycController = new KYCController();

// User KYC endpoints
router.get('/status', kycController.getKYCStatus);
router.get('/requirements', kycController.getKYCRequirements);
router.post('/submit', kycController.submitKYCForReview);

// Admin KYC endpoints  
router.get('/admin/pending', kycController.getPendingReviews);
router.post('/admin/approve', kycController.approveKYC);
router.post('/admin/reject', kycController.rejectKYC);

// Health check
router.get('/health', kycController.getHealthStatus);

export default router;