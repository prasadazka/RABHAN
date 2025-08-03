import { SolarCalculatorService } from '../src/services/solarCalculator.service';
import { ClientType, CalculationMode, SolarCalculationInput } from '../src/types/solar.types';

describe('SolarCalculatorService', () => {
  let service: SolarCalculatorService;

  beforeEach(() => {
    service = new SolarCalculatorService();
  });

  describe('Monthly Consumption Mode', () => {
    it('should calculate correctly for residential client with 8000 KWH', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.RESIDENTIAL,
        monthlyConsumption: 8000,
        numberOfInstallments: 30
      };

      const result = await service.calculate(input);

      expect(result.solarPowerKWP).toBe(10);
      expect(result.monthlyProduction).toBe(1583);
      expect(result.systemPrice).toBe(22000);
      expect(result.installmentValue).toBe(733);
      expect(result.extraElectricityPayment).toBe(1280);
      expect(result.totalMonthlyPayment).toBe(2013);
    });

    it('should calculate correctly for commercial client with 15000 KWH', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.COMMERCIAL,
        monthlyConsumption: 15000,
        numberOfInstallments: 36
      };

      const result = await service.calculate(input);

      expect(result.solarPowerKWP).toBe(16);
      expect(result.monthlyProduction).toBe(2533);
      expect(result.systemPrice).toBe(35200);
      expect(result.numberOfInstallments).toBe(36);
    });

    it('should handle minimum consumption of 6000 KWH', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.RESIDENTIAL,
        monthlyConsumption: 6000,
        numberOfInstallments: 24
      };

      const result = await service.calculate(input);

      expect(result.solarPowerKWP).toBe(10);
      expect(result.monthlyConsumption).toBe(6000);
    });

    it('should handle maximum consumption of 24000 KWH', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.COMMERCIAL,
        monthlyConsumption: 24000,
        numberOfInstallments: 60
      };

      const result = await service.calculate(input);

      expect(result.solarPowerKWP).toBe(25);
      expect(result.monthlyProduction).toBe(3958);
    });
  });

  describe('Monthly Bill Mode', () => {
    it('should calculate correctly for residential client with 1680 SAR bill', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_BILL,
        clientType: ClientType.RESIDENTIAL,
        monthlyBill: 1680,
        numberOfInstallments: 30
      };

      const result = await service.calculate(input);

      expect(result.monthlyConsumption).toBe(8000);
      expect(result.solarPowerKWP).toBe(10);
      expect(result.currentMonthlyBill).toBe(1680);
    });

    it('should calculate correctly for commercial client with 2100 SAR bill', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_BILL,
        clientType: ClientType.COMMERCIAL,
        monthlyBill: 2100,
        numberOfInstallments: 30
      };

      const result = await service.calculate(input);

      expect(result.monthlyConsumption).toBe(9000);
      expect(result.solarPowerKWP).toBe(10);
      expect(result.currentMonthlyBill).toBe(2100);
    });

    it('should handle minimum residential bill of 1080 SAR', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_BILL,
        clientType: ClientType.RESIDENTIAL,
        monthlyBill: 1080,
        numberOfInstallments: 12
      };

      const result = await service.calculate(input);

      expect(result.monthlyConsumption).toBe(6000);
      expect(result.currentMonthlyBill).toBe(1080);
    });

    it('should handle minimum commercial bill of 1200 SAR', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_BILL,
        clientType: ClientType.COMMERCIAL,
        monthlyBill: 1200,
        numberOfInstallments: 18
      };

      const result = await service.calculate(input);

      expect(result.monthlyConsumption).toBe(6000);
      expect(result.currentMonthlyBill).toBe(1200);
    });
  });

  describe('Admin Configuration', () => {
    it('should update admin configuration', () => {
      const newConfig = {
        electricityRate: 0.35,
        systemPricePerKWP: 2500
      };

      service.updateAdminConfig(newConfig);
      const config = service.getAdminConfig();

      expect(config.electricityRate).toBe(0.35);
      expect(config.systemPricePerKWP).toBe(2500);
    });

    it('should validate installment options', () => {
      expect(service.validateInstallmentOption(30)).toBe(true);
      expect(service.validateInstallmentOption(45)).toBe(false);
    });

    it('should return available installment options', () => {
      const options = service.getAvailableInstallmentOptions();
      expect(options).toEqual([12, 18, 24, 30, 36, 48, 60]);
    });
  });

  describe('Performance', () => {
    it('should complete calculations in under 2ms', async () => {
      const input: SolarCalculationInput = {
        mode: CalculationMode.MONTHLY_CONSUMPTION,
        clientType: ClientType.RESIDENTIAL,
        monthlyConsumption: 10000,
        numberOfInstallments: 30
      };

      const startTime = process.hrtime.bigint();
      await service.calculate(input);
      const duration = Number(process.hrtime.bigint() - startTime) / 1000000;

      expect(duration).toBeLessThan(2);
    });

    it('should handle 1000 concurrent calculations efficiently', async () => {
      const calculations = Array(1000).fill(null).map(() => {
        const input: SolarCalculationInput = {
          mode: CalculationMode.MONTHLY_CONSUMPTION,
          clientType: ClientType.RESIDENTIAL,
          monthlyConsumption: 6000 + Math.random() * 18000,
          numberOfInstallments: 30
        };
        return service.calculate(input);
      });

      const startTime = process.hrtime.bigint();
      const results = await Promise.all(calculations);
      const totalDuration = Number(process.hrtime.bigint() - startTime) / 1000000;

      expect(results).toHaveLength(1000);
      expect(totalDuration / 1000).toBeLessThan(2);
    });
  });
});