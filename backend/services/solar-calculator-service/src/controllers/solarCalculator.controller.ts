import { Request, Response, NextFunction } from 'express';
import { SolarCalculatorService } from '../services/solarCalculator.service';
import { solarCalculationSchema, adminConfigSchema } from '../utils/validation';
import { SolarCalculationInput } from '../types/solar.types';
import { logger } from '../utils/logger';

export class SolarCalculatorController {
  private solarCalculatorService: SolarCalculatorService;

  constructor() {
    this.solarCalculatorService = new SolarCalculatorService();
  }

  public calculate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = process.hrtime.bigint();
      
      const { error, value } = solarCalculationSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
        return;
      }

      const input: SolarCalculationInput = value;
      
      if (req.user?.id) {
        input.customerId = req.user.id;
      }

      const result = await this.solarCalculatorService.calculate(input);
      
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
      
      logger.info('Solar calculation completed', {
        calculationId: result.calculationId,
        clientType: result.clientType,
        duration: `${duration}ms`,
        customerId: input.customerId
      });

      res.status(200).json({
        success: true,
        data: result,
        metadata: {
          calculationId: result.calculationId,
          timestamp: result.calculatedAt,
          processingTime: `${duration}ms`
        }
      });
    } catch (error) {
      logger.error('Solar calculation failed', { error, body: req.body });
      next(error);
    }
  };

  public getInstallmentOptions = async (_req: Request, res: Response): Promise<void> => {
    try {
      const options = this.solarCalculatorService.getAvailableInstallmentOptions();
      
      res.status(200).json({
        success: true,
        data: {
          installmentOptions: options,
          defaultOption: options[0] || 12
        }
      });
    } catch (error) {
      logger.error('Failed to get installment options', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve installment options'
      });
    }
  };

  public getAdminConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized access'
        });
        return;
      }

      const config = this.solarCalculatorService.getAdminConfig();
      
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Failed to get admin config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration'
      });
    }
  };

  public updateAdminConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Unauthorized access'
        });
        return;
      }

      const { error, value } = adminConfigSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
        return;
      }

      this.solarCalculatorService.updateAdminConfig(value);
      
      logger.info('Admin config updated', {
        userId: req.user?.id,
        changes: value
      });

      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        data: this.solarCalculatorService.getAdminConfig()
      });
    } catch (error) {
      logger.error('Failed to update admin config', { error, body: req.body });
      next(error);
    }
  };

  public healthCheck = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      service: 'solar-calculator-service',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  };
}