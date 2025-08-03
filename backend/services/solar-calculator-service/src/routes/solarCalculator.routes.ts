import { Router } from 'express';
import { SolarCalculatorController } from '../controllers/solarCalculator.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { rateLimiter } from '../middlewares/rateLimiter.middleware';

export class SolarCalculatorRoutes {
  public router: Router;
  private solarCalculatorController: SolarCalculatorController;

  constructor() {
    this.router = Router();
    this.solarCalculatorController = new SolarCalculatorController();
    this.configureRoutes();
  }

  private configureRoutes(): void {
    this.router.post(
      '/calculate',
      rateLimiter({ windowMs: 60000, max: 100 }),
      this.solarCalculatorController.calculate
    );

    this.router.get(
      '/installment-options',
      rateLimiter({ windowMs: 60000, max: 200 }),
      this.solarCalculatorController.getInstallmentOptions
    );

    this.router.get(
      '/admin/config',
      authenticateToken,
      rateLimiter({ windowMs: 60000, max: 50 }),
      this.solarCalculatorController.getAdminConfig
    );

    this.router.put(
      '/admin/config',
      authenticateToken,
      rateLimiter({ windowMs: 60000, max: 10 }),
      this.solarCalculatorController.updateAdminConfig
    );

    this.router.get(
      '/health',
      this.solarCalculatorController.healthCheck
    );
  }
}