import express from 'express';
import Joi from 'joi';
import { penaltyController } from '../controllers/penalty.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation schemas
const penaltyApplicationSchema = Joi.object({
  contractor_id: Joi.string().uuid().required().messages({
    'any.required': 'contractor_id is required',
    'string.uuid': 'contractor_id must be a valid UUID'
  }),
  quote_id: Joi.string().uuid().required().messages({
    'any.required': 'quote_id is required',
    'string.uuid': 'quote_id must be a valid UUID'
  }),
  penalty_type: Joi.string().valid(
    'late_installation', 'quality_issue', 'communication_failure', 'documentation_issue', 'custom'
  ).required().messages({
    'any.required': 'penalty_type is required',
    'any.only': 'penalty_type must be one of: late_installation, quality_issue, communication_failure, documentation_issue, custom'
  }),
  description: Joi.string().min(10).max(1000).required().messages({
    'any.required': 'description is required',
    'string.min': 'description must be at least 10 characters long',
    'string.max': 'description cannot exceed 1000 characters'
  }),
  custom_amount: Joi.number().min(0).max(10000).optional().messages({
    'number.min': 'custom_amount must be at least 0',
    'number.max': 'custom_amount cannot exceed 10,000 SAR'
  }),
  evidence: Joi.object().optional()
});

const penaltyDisputeSchema = Joi.object({
  dispute_reason: Joi.string().min(10).max(1000).required().messages({
    'any.required': 'dispute_reason is required',
    'string.min': 'dispute_reason must be at least 10 characters long',
    'string.max': 'dispute_reason cannot exceed 1000 characters'
  })
});

const penaltyResolutionSchema = Joi.object({
  resolution: Joi.string().valid('uphold', 'waive', 'modify').required().messages({
    'any.required': 'resolution is required',
    'any.only': 'resolution must be one of: uphold, waive, modify'
  }),
  resolution_notes: Joi.string().min(10).max(1000).required().messages({
    'any.required': 'resolution_notes is required',
    'string.min': 'resolution_notes must be at least 10 characters long',
    'string.max': 'resolution_notes cannot exceed 1000 characters'
  })
});

const penaltyQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'applied', 'disputed', 'waived', 'reversed').optional(),
  penalty_type: Joi.string().valid(
    'late_installation', 'quality_issue', 'communication_failure', 'documentation_issue', 'custom'
  ).optional(),
  start_date: Joi.date().iso().optional().messages({
    'date.format': 'start_date must be a valid ISO date'
  }),
  end_date: Joi.date().iso().optional().messages({
    'date.format': 'end_date must be a valid ISO date'
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.integer': 'page must be a valid integer',
    'number.min': 'page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.integer': 'limit must be a valid integer',
    'number.min': 'limit must be at least 1',
    'number.max': 'limit cannot exceed 100'
  })
}).custom((value, helpers) => {
  if (value.start_date && value.end_date && value.start_date > value.end_date) {
    return helpers.error('any.invalid', { message: 'start_date cannot be after end_date' });
  }
  return value;
});

const statisticsQuerySchema = Joi.object({
  period: Joi.string().valid(
    'last_7_days', 'last_30_days', 'last_90_days', 'this_year'
  ).default('last_30_days').messages({
    'any.only': 'period must be one of: last_7_days, last_30_days, last_90_days, this_year'
  })
});

const uuidParamSchema = Joi.object({
  contractorId: Joi.string().uuid().required().messages({
    'any.required': 'contractorId is required',
    'string.uuid': 'contractorId must be a valid UUID'
  }),
  penaltyId: Joi.string().uuid().required().messages({
    'any.required': 'penaltyId is required',
    'string.uuid': 'penaltyId must be a valid UUID'
  })
});

// Admin-only routes
router.get(
  '/rules',
  requireRole('admin'),
  penaltyController.getPenaltyRules.bind(penaltyController)
);

router.post(
  '/apply',
  requireRole('admin'),
  validateRequest(penaltyApplicationSchema, 'body'),
  penaltyController.applyPenalty.bind(penaltyController)
);

router.get(
  '/violations/detect',
  requireRole('admin'),
  penaltyController.detectSLAViolations.bind(penaltyController)
);

router.post(
  '/violations/process',
  requireRole('admin'),
  penaltyController.processAutomaticPenalties.bind(penaltyController)
);

router.get(
  '/statistics',
  requireRole('admin'),
  validateRequest(statisticsQuerySchema, 'query'),
  penaltyController.getPenaltyStatistics.bind(penaltyController)
);

router.get(
  '/scheduler/status',
  requireRole('admin'),
  penaltyController.getSchedulerStatus.bind(penaltyController)
);

router.post(
  '/scheduler/run-check',
  requireRole('admin'),
  penaltyController.triggerManualPenaltyCheck.bind(penaltyController)
);

router.put(
  '/:penaltyId/resolve',
  requireRole('admin'),
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(penaltyResolutionSchema, 'body'),
  penaltyController.resolvePenaltyDispute.bind(penaltyController)
);

// Contractor routes - contractors can view their own penalties and dispute them
router.get(
  '/contractor/:contractorId',
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(penaltyQuerySchema, 'query'),
  penaltyController.getContractorPenalties.bind(penaltyController)
);

router.put(
  '/:penaltyId/dispute',
  requireRole('contractor'),
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(penaltyDisputeSchema, 'body'),
  penaltyController.disputePenalty.bind(penaltyController)
);

// Admin can also view any contractor's penalties
router.get(
  '/admin/contractor/:contractorId',
  requireRole('admin'),
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(penaltyQuerySchema, 'query'),
  penaltyController.getContractorPenalties.bind(penaltyController)
);

// Health check for penalty endpoints
router.get('/health', (req: any, res) => {
  res.status(200).json({
    success: true,
    message: 'Penalty Management API is healthy',
    timestamp: new Date().toISOString(),
    user_id: req.user?.id,
    user_role: req.user?.role
  });
});

export default router;